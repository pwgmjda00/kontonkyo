import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import worker from "../worker.js";
import { dailyIds, duelIds, jstDay } from "../../muka1-preview/catalog.js";
import { reconcile, festivalListing } from "../festival.js";
const root = new URL("../", import.meta.url);
const sql = (p) => readFileSync(new URL(p, root), "utf8");
const db = new DatabaseSync(":memory:");
db.exec(sql("schema.sql") + sql("submissions.sql") + sql("limits.sql"));
db.exec(
  "INSERT INTO votes VALUES('2026-11-20','old-voter',17); INSERT INTO submissions(text,status,created) VALUES('以前からの承認済み架空構文','approved','2026-11-20');",
);
const savedVotes = db.prepare("SELECT * FROM votes").all(),
  savedSubmissions = db.prepare("SELECT * FROM submissions").all();
for (const migration of ["0001_512.sql", "0002_analytics.sql"])
  db.exec("BEGIN;" + sql("migrations/" + migration) + "COMMIT;");
db.exec(sql("verify.sql"));
assert.deepEqual(db.prepare("SELECT * FROM votes").all(), savedVotes);
assert.deepEqual(
  db.prepare("SELECT * FROM submissions").all(),
  savedSubmissions,
);
const run = (query, args) => {
  const r = db.prepare(query).run(...args);
  return {
    success: true,
    meta: {
      changes: Number(r.changes),
      last_row_id: Number(r.lastInsertRowid),
    },
  };
};
const DB = {
  prepare(query) {
    let args = [];
    const item = {
      bind(...a) {
        args = a;
        return item;
      },
      async run() {
        return run(query, args);
      },
      async all() {
        return { results: db.prepare(query).all(...args) };
      },
      async first() {
        return db.prepare(query).get(...args) || null;
      },
    };
    return item;
  },
  async batch(items) {
    db.exec("BEGIN");
    try {
      const result = [];
      for (const q of items) result.push(await q.run());
      db.exec("COMMIT");
      return result;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  },
};
const env = { DB, ADMIN_TOKEN: "test-only-secret" };
const origin = "https://pwgmjda00.github.io";
async function call(path, body, headers = {}) {
  const req = new Request("https://test.invalid" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const r = await worker.fetch(req, env);
  return { status: r.status, ...(await r.json()) };
}
const today = jstDay(),
  pair = duelIds(today),
  client = randomUUID();
assert.equal((await call("/health")).catalog, 512);
let r = await call("/duel/daily");
assert.deepEqual(r.pair, pair);
assert.equal(r.total, 0);
r = await call("/duel/vote", { day: today, pair, phrase: pair[0], client });
assert.equal(r.accepted, true);
assert.equal(r.total, 1);
r = await call("/duel/vote", { day: today, pair, phrase: pair[1], client });
assert.equal(r.accepted, false);
assert.equal(r.selected, pair[0]);
assert.equal(r.total, 1);
assert.equal(
  (
    await call("/duel/vote", {
      day: "2026-01-01",
      pair,
      phrase: pair[0],
      client,
    })
  ).status,
  409,
);
assert.equal(
  (await call("/duel/vote", { day: today, pair: [0, 1], phrase: 0, client }))
    .status,
  400,
);
assert.equal((await call("/duel/daily?day=2026-02-30")).status, 400);
assert.equal((await call("/duel/daily?day=2099-01-01")).status, 400);
assert.equal((await call("/duel/daily?day=2026-11-20")).readOnly, true);
assert.equal(
  (
    await call(
      "/duel/vote",
      { day: today, pair, phrase: pair[0], client: randomUUID() },
      { Origin: "https://evil.invalid" },
    )
  ).status,
  403,
);
const voteClient = randomUUID();
r = await call("/vote", {
  day: today,
  phrase: dailyIds(today)[0],
  client: voteClient,
});
assert.equal(r.accepted, true);
assert.equal(
  (await call("/vote", { phrase: dailyIds(today)[0], client: voteClient }))
    .accepted,
  false,
);
assert.equal((await call("/ranking")).ranking.length, 8);
assert.equal(
  (await call("/ranking?day=2026-11-20")).ranking.some(
    (x) => x.phrase === 17 && x.votes === 1,
  ),
  true,
);
assert.equal((await call("/admin/submissions")).status, 401);
r = await call(
  "/submissions",
  { text: "架空の新しい投稿のつもりです", confirm: true },
  { "CF-Connecting-IP": "192.0.2.2" },
);
assert.equal(r.accepted, true);
const pending = db
  .prepare("SELECT id FROM submissions WHERE status='pending'")
  .get().id;
r = await call(
  "/admin/submissions",
  { id: pending, status: "approved", text: "架空の新しい投稿のつもりです" },
  { Authorization: "Bearer test-only-secret" },
);
assert.equal(r.updated, true);
assert.equal((await call("/approved")).items.length, 2);
assert.equal(
  (
    await call(
      "/submissions",
      { text: "http://personal.invalid", confirm: true },
      { "CF-Connecting-IP": "192.0.2.2" },
    )
  ).status,
  400,
);
assert.equal((await call("/approved?after=-1")).status, 400);
assert.equal((await call("/history?before=oops")).status, 400);
// Add sufficient historical weekly champions, then assert monthly freeze, ties and boundaries.
db.exec(
  "DELETE FROM festival_state; INSERT INTO votes VALUES('2026-10-05','a',0),('2026-10-12','b',1),('2026-10-12','c',1),('2026-10-26','d',2); INSERT INTO votes VALUES('2026-09-28','cross',3)",
);
await reconcile(DB, "2026-11-01");
let listing = await festivalListing(DB, "2026-11-01");
assert.equal(listing.active.id, "month:2026-10");
assert.deepEqual(listing.active.candidates, [0, 1, 3]);
// October 26 week ends November 1, so its winner belongs to November.
assert.equal(listing.active.candidates.includes(2), false);
const frozen = db
  .prepare("SELECT candidates FROM championships WHERE id='month:2026-10'")
  .get().candidates;
db.exec(
  "INSERT INTO festival_votes VALUES('month:2026-10','m1',0),('month:2026-10','m2',1)",
);
await reconcile(DB, "2026-11-04");
const closed = db
  .prepare("SELECT * FROM championships WHERE id='month:2026-10'")
  .get();
assert.deepEqual(JSON.parse(closed.winners), [0, 1]);
assert.equal(closed.status, "closed");
assert.equal(closed.candidates, frozen);
await reconcile(DB, "2026-11-05");
assert.deepEqual(
  db.prepare("SELECT * FROM championships WHERE id='month:2026-10'").get(),
  closed,
);
// A month with no special votes yields no champion; yearly voting remains independent.
await reconcile(DB, "2027-01-04");
listing = await festivalListing(DB, "2027-01-04");
assert.equal(listing.active.id, "year:2026");
assert.deepEqual(listing.active.candidates, [0, 1]);
await reconcile(DB, "2027-01-11");
assert.deepEqual(
  JSON.parse(
    db.prepare("SELECT winners FROM championships WHERE id='year:2026'").get()
      .winners,
  ),
  [],
);
// A request body arriving across JST midnight cannot add a late vote.
const RealDate = globalThis.Date;
let mockedNow = RealDate.parse(today + "T14:59:59.999Z");
globalThis.Date = class extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [mockedNow]));
  }
  static now() {
    return mockedNow;
  }
};
const countBefore = db.prepare("SELECT COUNT(*) AS n FROM duel_votes").get().n;
let reads = 0;
const delayedReq = {
  url: "https://test.invalid/duel/vote",
  method: "POST",
  headers: new Headers({ Origin: origin }),
  body: {
    getReader() {
      return {
        async read() {
          if (reads++) return { done: true };
          mockedNow += 1;
          return {
            done: false,
            value: new TextEncoder().encode(
              JSON.stringify({
                day: today,
                pair,
                phrase: pair[0],
                client: randomUUID(),
              }),
            ),
          };
        },
        async cancel() {},
      };
    },
  },
};
assert.equal((await worker.fetch(delayedReq, env)).status, 409);
assert.equal(
  db.prepare("SELECT COUNT(*) AS n FROM duel_votes").get().n,
  countBefore,
);
globalThis.Date = RealDate;
// Expanded IDs are accepted by the migrated schema; arbitrary IDs remain blocked at API.
db.exec("INSERT INTO votes VALUES('2026-11-26','expanded',1000510)");
assert.equal(
  (await call("/vote", { phrase: 99999999, client: randomUUID() })).status,
  400,
);
// More than twelve weeks remain queryable through the archive cursor.
for (let i = 1; i <= 30; i++) {
  const d = new Date("2025-01-06T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + i * 7);
  db.prepare("INSERT INTO votes VALUES(?,?,?)").run(
    d.toISOString().slice(0, 10),
    "archive" + i,
    i % 10,
  );
}
db.exec("DELETE FROM festival_state");
await reconcile(DB, today);
const history = await call("/history");
assert.ok(history.nextCursor);
const older = await call("/history?before=" + history.nextCursor);
assert.ok(older.weeks.length);
assert.ok(older.weeks.every((x) => x.week < history.nextCursor));
console.log(
  "PASS migration preservation; actual Worker routing; duplex vote dedup; stale-day/origin/input checks; rankings; submission approval; month/week/year boundaries; ties/zero; immutable archives; 20-week paging",
);
