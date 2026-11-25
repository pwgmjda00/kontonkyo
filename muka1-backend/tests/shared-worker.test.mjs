import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import worker from "../worker.js";

const ORIGIN = "https://pwgmjda00.github.io";
const FIXED_DAY = "2026-11-25";
// Snapshot of the original 8487839 Worker for this JST day.
const ORIGINAL_DAILY_IDS = [124, 116, 6, 48, 130, 223, 186, 66];
function d1(db) {
  return {
    prepare(sql) {
      let args = [];
      const statement = {
        bind(...values) {
          args = values;
          return statement;
        },
        async all() {
          return { results: db.prepare(sql).all(...args) };
        },
        async run() {
          const r = db.prepare(sql).run(...args);
          return { meta: { changes: Number(r.changes) } };
        },
      };
      return statement;
    },
  };
}
async function call(env, path, body, origin = ORIGIN) {
  const response = await worker.fetch(
    new Request("https://worker.test" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    env,
  );
  return { status: response.status, body: await response.json() };
}

test("shared daily catalog retains legacy Worker votes, ranking and ID restrictions", async () => {
  const NativeDate = Date;
  globalThis.Date = class extends NativeDate {
    constructor(...args) {
      super(...(args.length ? args : ["2026-11-25T12:00:00Z"]));
    }
    static now() {
      return NativeDate.parse("2026-11-25T12:00:00Z");
    }
  };
  const db = new DatabaseSync(":memory:");
  try {
    for (const file of ["schema.sql", "submissions.sql", "limits.sql"])
      db.exec(readFileSync(new URL("../" + file, import.meta.url), "utf8"));
    const env = { DB: d1(db) };
    const ids = ORIGINAL_DAILY_IDS;
    const client = "00000000-0000-4000-8000-000000000001";
    const legacyHash = createHash("sha256")
      .update(FIXED_DAY + ":" + client)
      .digest("hex");
    db.prepare("INSERT INTO votes(day,client,phrase) VALUES(?,?,?)").run(
      FIXED_DAY,
      legacyHash,
      ids[0],
    );
    const before = db.prepare("SELECT * FROM votes").all();
    let result = await call(env, "/ranking");
    assert.equal(result.status, 200);
    assert.equal(result.body.day, FIXED_DAY);
    assert.equal(result.body.period, "day");
    assert.deepEqual(
      result.body.ranking.map((x) => x.phrase).sort((a, b) => a - b),
      ids.slice().sort((a, b) => a - b),
    );
    assert.equal(result.body.ranking.find((x) => x.phrase === ids[0]).votes, 1);
    result = await call(env, "/vote", { phrase: ids[1], client });
    assert.deepEqual(result, { status: 200, body: { accepted: false } });
    assert.deepEqual(db.prepare("SELECT * FROM votes").all(), before);
    result = await call(env, "/vote", {
      phrase: ids[1],
      client: "00000000-0000-4000-8000-000000000002",
    });
    assert.deepEqual(result, { status: 200, body: { accepted: true } });
    for (const phrase of [1000255, 1000510, 256, -1, "0"]) {
      result = await call(env, "/vote", {
        phrase,
        client: "00000000-0000-4000-8000-000000000003",
      });
      assert.equal(result.status, 400);
    }
    const outsider = Array.from({ length: 256 }, (_, i) => i).find(
      (id) => !ids.includes(id),
    );
    assert.equal(
      (await call(env, "/vote", { phrase: outsider, client })).status,
      400,
    );
    assert.equal(
      (
        await call(
          env,
          "/vote",
          { phrase: ids[0], client },
          "https://other.test",
        )
      ).status,
      403,
    );
    result = await call(env, "/ranking?period=week");
    assert.equal(result.body.from, "2026-11-23");
    assert.deepEqual(
      result.body.ranking.map((x) => ({ phrase: x.phrase, votes: x.votes })),
      [ids[0], ids[1]]
        .sort((a, b) => a - b)
        .map((phrase) => ({ phrase, votes: 1 })),
    );
    assert.equal((await call(env, "/history")).status, 200);
    for (const path of [
      "/duel/daily",
      "/festival",
      "/analytics/events",
      "/health",
    ])
      assert.equal((await call(env, path)).status, 404);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM votes").get().n, 2);
  } finally {
    db.close();
    globalThis.Date = NativeDate;
  }
});
