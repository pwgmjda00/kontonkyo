import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { handleAnalytics, recordServerEvent } from "../analytics.js";

function setup() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    readFileSync(new URL("../analytics.sql", import.meta.url), "utf8"),
  );
  const DB = {
    prepare(sql) {
      return {
        sql,
        args: [],
        bind(...args) {
          this.args = args;
          return this;
        },
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results = statements.map(({ sql, args }) => {
          const stmt = sqlite.prepare(sql);
          if (/^\s*SELECT/i.test(sql)) return { results: stmt.all(...args) };
          return { meta: { changes: Number(stmt.run(...args).changes) } };
        });
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  const env = { DB };
  const context = {
    day: "2026-11-25",
    admin: true,
    out: (body, status = 200) => new Response(JSON.stringify(body), { status }),
  };
  async function post(events, extra = {}) {
    const req = new Request("https://api.invalid/analytics/events", {
      method: "POST",
      body: JSON.stringify({ events, ...extra }),
      headers: { "CF-Connecting-IP": crypto.randomUUID() },
    });
    return handleAnalytics(req, env, context);
  }
  async function admin(search = "") {
    return (
      await handleAnalytics(
        new Request("https://api.invalid/admin/analytics" + search),
        env,
        context,
      )
    ).json();
  }
  const event = (name = "visit") => ({
    id: crypto.randomUUID(),
    event: name,
    mode: "duel",
    source: "direct",
  });
  return { sqlite, env, context, post, admin, event };
}

test("duplicate event IDs count once, including a repeated ID in the same batch", async () => {
  const { post, admin, event } = setup();
  const first = event();
  assert.equal((await (await post([first, first])).json()).accepted, 1);
  assert.equal((await (await post([first])).json()).accepted, 0);
  const stats = await admin();
  assert.equal(stats.totals.visit, 1);
  assert.equal(stats.bySource.direct.visit, 1);
});

test("no private fields, server events or invalid enums can enter through public input", async () => {
  const { post, event, sqlite } = setup();
  for (const bad of [
    { ...event(), url: "https://secret.invalid/?token=private" },
    { ...event(), ip: "192.0.2.1" },
    { ...event(), event: "daily_vote_accepted" },
    { ...event(), mode: "secret tournament title" },
    { ...event(), source: "https://referrer.invalid" },
    { ...event(), invite: "contact@example.invalid" },
    { ...event(), id: 3 },
  ])
    assert.equal((await post([bad])).status, 400);
  assert.equal((await post([event()], { client: "fingerprint" })).status, 400);
  assert.equal(
    sqlite.prepare("SELECT COUNT(*) n FROM analytics_events").get().n,
    0,
  );
});

test("batch and byte limits are enforced and disabled analytics writes nothing", async () => {
  const { post, event, env, sqlite, context } = setup();
  assert.equal(
    (await post(Array.from({ length: 20 }, () => event()))).status,
    200,
  );
  assert.equal(
    (await post(Array.from({ length: 21 }, () => event()))).status,
    400,
  );
  const oversized = new Request("https://api.invalid/analytics/events", {
    method: "POST",
    body: "x".repeat(16385),
  });
  assert.equal((await handleAnalytics(oversized, env, context)).status, 413);
  env.ANALYTICS_ENABLED = "false";
  assert.deepEqual(await (await post([event()])).json(), {
    accepted: 0,
    enabled: false,
  });
  await recordServerEvent(env, "daily_vote_accepted", context.day);
  assert.equal(
    sqlite.prepare("SELECT COUNT(*) n FROM analytics_events").get().n,
    20,
  );
});

test("admin authentication, validated period, null zero denominators and server counters", async () => {
  const { env, context, admin } = setup();
  assert.equal(
    (
      await handleAnalytics(
        new Request("https://api.invalid/admin/analytics"),
        env,
        { ...context, admin: false },
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await handleAnalytics(
        new Request("https://api.invalid/admin/analytics?days=90"),
        env,
        context,
      )
    ).status,
    400,
  );
  let stats = await admin("?days=30");
  assert.equal(stats.daily.length, 30);
  assert.equal(stats.from, "2026-10-27");
  assert.equal(stats.rates.duelCompletion, null);
  assert.equal(stats.rates.completionsPerInvite, null);
  await recordServerEvent(env, "daily_vote_accepted", context.day);
  stats = await admin();
  assert.equal(stats.totals.daily_vote_accepted, 1);
  assert.equal(stats.totals.visit, 0);
});

test("invite completion proxy, per-invite aggregate and retained daily counts", async () => {
  const { post, event, admin, sqlite } = setup();
  const invite = crypto.randomUUID();
  await post([
    event("duel_start"),
    event("duel_complete"),
    event("duel_complete"),
    { ...event("invite_visit"), source: "invite", invite },
    { ...event("invite_complete"), source: "invite", invite },
  ]);
  const stats = await admin();
  assert.equal(stats.rates.duelCompletion, 2); // Event ratio, never implied unique people.
  assert.equal(stats.rates.inviteCompletionProxy, 0.5);
  assert.equal(stats.rates.completionsPerInvite, 1);
  assert.equal(stats.inviteCompletions.length, 1);
  sqlite
    .prepare("INSERT INTO analytics_events VALUES(?,?,?,?,?,?,?)")
    .run("old", "2026-10-26", "old", "visit", "other", "direct", null);
  sqlite
    .prepare("INSERT INTO analytics_daily VALUES(?,?,?,?,?)")
    .run("2026-08-27", "visit", "other", "direct", 2);
  sqlite
    .prepare("INSERT INTO analytics_daily VALUES(?,?,?,?,?)")
    .run("2026-08-28", "visit", "other", "direct", 3);
  await post([event()]);
  assert.equal(
    sqlite
      .prepare("SELECT COUNT(*) n FROM analytics_events WHERE id='old'")
      .get().n,
    0,
  );
  assert.equal(
    sqlite
      .prepare("SELECT COUNT(*) n FROM analytics_daily WHERE day='2026-08-27'")
      .get().n,
    0,
  );
  assert.equal(
    sqlite.prepare("SELECT n FROM analytics_daily WHERE day='2026-08-28'").get()
      .n,
    3,
  );
});

test("rate limit is enforced without persisting the IP address", async () => {
  const { env, context, event, sqlite } = setup();
  const ip = "192.0.2." + Math.floor(Math.random() * 200);
  let response;
  for (let i = 0; i < 7; i++)
    response = await handleAnalytics(
      new Request("https://api.invalid/analytics/events", {
        method: "POST",
        body: JSON.stringify({
          events: Array.from({ length: 20 }, () => event()),
        }),
        headers: { "CF-Connecting-IP": ip },
      }),
      env,
      context,
    );
  assert.equal(response.status, 429);
  assert.equal(
    sqlite.prepare("SELECT COUNT(*) n FROM analytics_events").get().n,
    120,
  );
  assert.equal(
    sqlite
      .prepare("SELECT COUNT(*) n FROM analytics_events WHERE source=? OR id=?")
      .get(ip, ip).n,
    0,
  );
});
