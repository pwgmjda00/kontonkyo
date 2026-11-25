import {
  PHRASE_MAP,
  dailyIds,
  duelIds,
  jstDay,
  validDay,
  weekStart,
  addDays,
} from "../muka1-preview/catalog.js";
import { reconcile, specialView, festivalListing } from "./festival.js";
import {
  handleAnalytics,
  recordServerEvent,
  pruneAnalytics,
} from "./analytics.js";

const ORIGIN = "https://pwgmjda00.github.io";
const CLIENT =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const textOK = (t) =>
  typeof t === "string" &&
  t.trim().length >= 5 &&
  t.trim().length <= 140 &&
  !/@|https?:|www\./i.test(t);
const hex = (b) =>
  Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join(
    "",
  );
const hash = async (s) =>
  hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
const rows = async (db, sql, ...args) =>
  (
    await db
      .prepare(sql)
      .bind(...args)
      .all()
  ).results;
const samePair = (a, b) =>
  Array.isArray(a) &&
  a.length === 2 &&
  a.every((v, i) => Number.isInteger(v) && v === b[i]);
async function requestBody(req, max = 2048) {
  if (Number(req.headers.get("Content-Length")) > max)
    throw Object.assign(Error("size"), { status: 413 });
  const reader = req.body?.getReader();
  if (!reader) throw Object.assign(Error("invalid"), { status: 400 });
  const chunks = [];
  let n = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.length;
    if (n > max) {
      await reader.cancel();
      throw Object.assign(Error("size"), { status: 413 });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(n);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw Object.assign(Error("invalid json"), { status: 400 });
  }
}
async function duelView(db, day, today) {
  const pair = duelIds(day),
    tally = new Map(
      (
        await rows(
          db,
          "SELECT phrase,COUNT(*) AS votes FROM duel_votes WHERE day=? GROUP BY phrase",
          day,
        )
      ).map((x) => [x.phrase, x.votes]),
    );
  const counts = pair.map((phrase) => ({
    phrase,
    votes: tally.get(phrase) || 0,
  }));
  return {
    day,
    pair,
    counts,
    total: counts.reduce((s, x) => s + x.votes, 0),
    asOf: new Date().toISOString(),
    readOnly: day !== today,
  };
}
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      Promise.all([
        reconcile(env.DB, jstDay()),
        pruneAnalytics(env, jstDay()),
      ]).catch(() => {}),
    );
  },
  async fetch(req, env) {
    const headers = {
      "Access-Control-Allow-Origin": ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      Vary: "Origin",
      "X-Content-Type-Options": "nosniff",
    };
    const out = (value, status = 200) =>
      new Response(JSON.stringify(value), { status, headers });
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    const u = new URL(req.url),
      day = jstDay();
    const admin =
      Boolean(env.ADMIN_TOKEN) &&
      req.headers.get("Authorization") === "Bearer " + env.ADMIN_TOKEN;
    try {
      if (req.method === "POST" && req.headers.get("Origin") !== ORIGIN)
        return out({ error: "origin" }, 403);
      const analytics = await handleAnalytics(req, env, { day, admin, out });
      if (analytics) return analytics;
      if (u.pathname === "/health" && req.method === "GET") {
        await env.DB.prepare("SELECT 1 FROM duel_votes LIMIT 1").all();
        return out({
          ok: true,
          catalog: PHRASE_MAP.size,
          day,
          version: "512-v1",
        });
      }
      if (u.pathname === "/duel/daily" && req.method === "GET") {
        const requested = u.searchParams.get("day") || day;
        if (!validDay(requested) || requested > day)
          return out({ error: "invalid day" }, 400);
        return out(await duelView(env.DB, requested, day));
      }
      if (u.pathname === "/duel/vote" && req.method === "POST") {
        const b = await requestBody(req);
        if (b.day !== day) return out({ error: "day changed", day }, 409);
        const pair = duelIds(day);
        if (
          !samePair(b.pair, pair) ||
          !pair.includes(b.phrase) ||
          !CLIENT.test(b.client)
        )
          return out({ error: "invalid" }, 400);
        if (jstDay() !== day)
          return out({ error: "day changed", day: jstDay() }, 409);
        const client = await hash(day + ":duel:" + b.client);
        const r = await env.DB.prepare(
          "INSERT OR IGNORE INTO duel_votes(day,client,phrase) SELECT ?,?,? WHERE ?=date('now','+9 hours')",
        )
          .bind(day, client, b.phrase, day)
          .run();
        if (jstDay() !== day)
          return out({ error: "day changed", day: jstDay() }, 409);
        const selected = (
          await env.DB.prepare(
            "SELECT phrase FROM duel_votes WHERE day=? AND client=?",
          )
            .bind(day, client)
            .first()
        ).phrase;
        if (r.meta.changes === 1 && b.analytics !== false)
          await recordServerEvent(env, "daily_vote_accepted", day, "duel");
        return out({
          ...(await duelView(env.DB, day, day)),
          accepted: r.meta.changes === 1,
          selected,
        });
      }
      if (u.pathname === "/vote" && req.method === "POST") {
        const b = await requestBody(req);
        if (b.day !== undefined && b.day !== day)
          return out({ error: "day changed", day }, 409);
        if (
          !Number.isInteger(b.phrase) ||
          !PHRASE_MAP.has(b.phrase) ||
          !dailyIds(day).includes(b.phrase) ||
          !CLIENT.test(b.client)
        )
          return out({ error: "invalid" }, 400);
        // Legacy hashing deliberately preserved, so existing device/day votes stay deduplicated.
        if (jstDay() !== day)
          return out({ error: "day changed", day: jstDay() }, 409);
        const client = await hash(day + ":" + b.client);
        const r = await env.DB.prepare(
          "INSERT OR IGNORE INTO votes(day,client,phrase) SELECT ?,?,? WHERE ?=date('now','+9 hours')",
        )
          .bind(day, client, b.phrase, day)
          .run();
        if (jstDay() !== day)
          return out({ error: "day changed", day: jstDay() }, 409);
        if (r.meta.changes === 1 && b.analytics !== false)
          await recordServerEvent(env, "daily_vote_accepted", day);
        return out({ accepted: r.meta.changes === 1, day });
      }
      if (u.pathname === "/ranking" && req.method === "GET") {
        const requested = u.searchParams.get("day") || day;
        if (!validDay(requested) || requested > day)
          return out({ error: "invalid day" }, 400);
        if (u.searchParams.get("period") === "week") {
          const from = weekStart(requested),
            ranking = await rows(
              env.DB,
              "SELECT phrase,COUNT(*) AS votes FROM votes WHERE day BETWEEN ? AND ? GROUP BY phrase ORDER BY votes DESC,phrase LIMIT 20",
              from,
              requested,
            );
          return out({ day: requested, from, period: "week", ranking });
        }
        const tally = new Map(
          (
            await rows(
              env.DB,
              "SELECT phrase,COUNT(*) AS votes FROM votes WHERE day=? GROUP BY phrase",
              requested,
            )
          ).map((x) => [x.phrase, x.votes]),
        );
        const ids = [...new Set([...dailyIds(requested), ...tally.keys()])];
        return out({
          day: requested,
          period: "day",
          ranking: ids
            .map((phrase) => ({ phrase, votes: tally.get(phrase) || 0 }))
            .sort((a, b) => b.votes - a.votes || a.phrase - b.phrase),
        });
      }
      if (u.pathname === "/history" && req.method === "GET") {
        await reconcile(env.DB, day);
        const before = u.searchParams.get("before") || weekStart(day);
        if (!validDay(before) || before > weekStart(day))
          return out({ error: "invalid cursor" }, 400);
        const prev = addDays(day, -1),
          daily = await env.DB.prepare(
            "SELECT results,winners FROM championships WHERE id=?",
          )
            .bind("day:" + prev)
            .first();
        const winners = daily
          ? JSON.parse(daily.results).filter((x) =>
              JSON.parse(daily.winners).includes(x.phrase),
            )
          : [];
        const records = await rows(
          env.DB,
          "SELECT period,results,winners FROM championships WHERE kind='week' AND period<? ORDER BY period DESC LIMIT 21",
          before,
        );
        const weeks = records.slice(0, 20).flatMap((r) =>
          JSON.parse(r.results)
            .filter((x) => JSON.parse(r.winners).includes(x.phrase))
            .map((x) => ({ week: r.period, ...x })),
        );
        return out({
          day: prev,
          winners,
          weeks,
          nextCursor: records.length > 20 ? records[19].period : null,
        });
      }
      if (u.pathname === "/festival" && req.method === "GET") {
        await reconcile(env.DB, day);
        const id = u.searchParams.get("id");
        if (id) {
          if (!/^(month:\d{4}-\d{2}|year:\d{4})$/.test(id))
            return out({ error: "invalid id" }, 400);
          const record = await env.DB.prepare(
            "SELECT * FROM championships WHERE id=? AND kind IN ('month','year')",
          )
            .bind(id)
            .first();
          if (!record) return out({ error: "not found" }, 404);
          return out({ festival: await specialView(env.DB, record) });
        }
        const cursor = u.searchParams.get("cursor");
        if (cursor && !/^(month:\d{4}-\d{2}|year:\d{4})$/.test(cursor))
          return out({ error: "invalid cursor" }, 400);
        return out(await festivalListing(env.DB, day, cursor));
      }
      if (u.pathname === "/festival/vote" && req.method === "POST") {
        const b = await requestBody(req);
        await reconcile(env.DB, day);
        if (
          typeof b.id !== "string" ||
          !Number.isInteger(b.phrase) ||
          !CLIENT.test(b.client)
        )
          return out({ error: "invalid" }, 400);
        const f = await env.DB.prepare(
          "SELECT * FROM championships WHERE id=? AND kind IN ('month','year')",
        )
          .bind(b.id)
          .first();
        if (!f || f.status !== "open" || day < f.start || day > f.end)
          return out({ error: "closed" }, 409);
        if (!JSON.parse(f.candidates).includes(b.phrase))
          return out({ error: "invalid candidate" }, 400);
        if (jstDay() !== day)
          return out({ error: "day changed", day: jstDay() }, 409);
        const client = await hash("festival:" + b.id + ":" + b.client);
        const r = await env.DB.prepare(
          "INSERT OR IGNORE INTO festival_votes(festival,client,phrase) SELECT ?,?,? WHERE ?=date('now','+9 hours')",
        )
          .bind(b.id, client, b.phrase, day)
          .run();
        if (jstDay() !== day)
          return out({ error: "day changed", day: jstDay() }, 409);
        const selected = (
          await env.DB.prepare(
            "SELECT phrase FROM festival_votes WHERE festival=? AND client=?",
          )
            .bind(b.id, client)
            .first()
        ).phrase;
        return out({
          ...(await specialView(env.DB, f)),
          accepted: r.meta.changes === 1,
          selected,
        });
      }
      if (u.pathname === "/submissions" && req.method === "POST") {
        const b = await requestBody(req),
          t = typeof b.text === "string" ? b.text.trim() : "";
        if (!textOK(t) || b.confirm !== true)
          return out({ error: "invalid" }, 400);
        if (
          [...PHRASE_MAP.values()].some(
            (v) => (typeof v === "string" ? v : v.text) === t,
          )
        )
          return out({ error: "duplicate" }, 409);
        const ip = req.headers.get("CF-Connecting-IP");
        if (!ip || !env.ADMIN_TOKEN) return out({ error: "unavailable" }, 503);
        const key = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(env.ADMIN_TOKEN),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );
        const bucket = hex(
          await crypto.subtle.sign(
            "HMAC",
            key,
            new TextEncoder().encode("submission:" + day + ":" + ip),
          ),
        );
        const limit = await env.DB.prepare(
          "INSERT INTO submission_limits(day,bucket,n) VALUES(?,?,1) ON CONFLICT(day,bucket) DO UPDATE SET n=n+1 WHERE n<5",
        )
          .bind(day, bucket)
          .run();
        if (!limit.meta.changes) return out({ error: "rate limit" }, 429);
        const r = await env.DB.prepare(
          "INSERT INTO submissions(text,status,created) SELECT ?,'pending',? WHERE NOT EXISTS (SELECT 1 FROM submissions WHERE text=? AND status IN ('pending','approved')) AND (SELECT COUNT(*) FROM submissions WHERE status='pending')<500 AND COALESCE((SELECT MAX(id) FROM submissions),0)<999999",
        )
          .bind(t, new Date().toISOString(), t)
          .run();
        if (!r.meta.changes)
          return out({ error: "duplicate or queue full" }, 409);
        if (b.analytics !== false)
          await recordServerEvent(env, "submission_accepted", day);
        return out({ accepted: true }, 201);
      }
      if (u.pathname === "/admin/submissions") {
        if (!admin) return out({ error: "unauthorized" }, 401);
        if (req.method === "GET")
          return out({
            items: await rows(
              env.DB,
              "SELECT id,text,created FROM submissions WHERE status='pending' ORDER BY id LIMIT 100",
            ),
          });
        if (req.method === "POST") {
          const b = await requestBody(req),
            t = typeof b.text === "string" ? b.text.trim() : "";
          if (
            !Number.isInteger(b.id) ||
            b.id < 1 ||
            b.id > 999999 ||
            !["approved", "rejected"].includes(b.status) ||
            (b.status === "approved" && !textOK(t))
          )
            return out({ error: "invalid" }, 400);
          if (
            b.status === "approved" &&
            [...PHRASE_MAP.values()].some(
              (v) => (typeof v === "string" ? v : v.text) === t,
            )
          )
            return out({ error: "duplicate" }, 409);
          if (
            b.status === "approved" &&
            (await env.DB.prepare(
              "SELECT id FROM submissions WHERE text=? AND status='approved' AND id<>?",
            )
              .bind(t, b.id)
              .first())
          )
            return out({ error: "duplicate" }, 409);
          const r = await env.DB.prepare(
            "UPDATE submissions SET status=?,text=CASE WHEN ?='approved' THEN ? ELSE text END WHERE id=? AND status='pending'",
          )
            .bind(b.status, b.status, t, b.id)
            .run();
          return out({ updated: r.meta.changes === 1 });
        }
      }
      if (u.pathname === "/approved" && req.method === "GET") {
        const after = Number(u.searchParams.get("after") || 0);
        if (!Number.isSafeInteger(after) || after < 0 || after > 999999)
          return out({ error: "invalid cursor" }, 400);
        const items = await rows(
          env.DB,
          "SELECT id,text FROM submissions WHERE status='approved' AND id>? AND id<=999999 ORDER BY id LIMIT 501",
          after,
        );
        return out({
          items: items.slice(0, 500),
          nextCursor: items.length > 500 ? items[499].id : null,
        });
      }
      return out({ error: "not found" }, 404);
    } catch (error) {
      // Never include exception strings, SQL, headers or secrets in API responses/logs.
      return out(
        {
          error:
            error.status === 413
              ? "size"
              : error.status === 400
                ? "invalid request"
                : "temporarily unavailable",
        },
        error.status || 503,
      );
    }
  },
};
