import { jstDay, addDays, weekStart } from "../muka1-preview/catalog.js";

const top = (rows) =>
  rows.length
    ? rows
        .filter((x) => x.votes === Math.max(...rows.map((v) => v.votes)))
        .map((x) => x.phrase)
    : [];
const monthEnd = (period) =>
  addDays(
    period + "-01",
    new Date(
      Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5)), 0),
    ).getUTCDate() - 1,
  );
const monthNext = (period) =>
  new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5)), 1))
    .toISOString()
    .slice(0, 7);
const resultRows = async (db, sql, ...bind) =>
  (
    await db
      .prepare(sql)
      .bind(...bind)
      .all()
  ).results;
const batches = async (db, statements) => {
  for (let i = 0; i < statements.length; i += 40)
    await db.batch(statements.slice(i, i + 40));
};

// Closed periods are immutable snapshots. No candidate/result is inferred from local UI activity.
export async function reconcile(db, day = jstDay()) {
  const state = await db
    .prepare("SELECT value FROM festival_state WHERE key='reconciled'")
    .first();
  if (state?.value === day) return;
  const from = state ? addDays(state.value, -7) : "0001-01-01";
  const raw = await resultRows(
    db,
    "SELECT day,phrase,COUNT(*) AS votes FROM votes WHERE day>=? AND day<? GROUP BY day,phrase ORDER BY day,phrase",
    from,
    day,
  );
  const days = new Map(),
    weeks = new Map();
  for (const r of raw) {
    if (!days.has(r.day)) days.set(r.day, []);
    days.get(r.day).push({ phrase: r.phrase, votes: r.votes });
    const w = weekStart(r.day);
    if (addDays(w, 6) >= day) continue;
    if (!weeks.has(w)) weeks.set(w, new Map());
    weeks.get(w).set(r.phrase, (weeks.get(w).get(r.phrase) || 0) + r.votes);
  }
  const saves = [];
  for (const [d, counts] of days)
    saves.push(
      db
        .prepare(
          "INSERT OR IGNORE INTO championships(id,kind,period,start,end,candidates,results,winners,status,finalized) VALUES(?,'day',?,?,?, ?,?,?,'closed',?)",
        )
        .bind(
          "day:" + d,
          d,
          d,
          d,
          JSON.stringify(counts.map((x) => x.phrase)),
          JSON.stringify(counts),
          JSON.stringify(top(counts)),
          day,
        ),
    );
  for (const [w, totals] of weeks) {
    const counts = [...totals].map(([phrase, votes]) => ({ phrase, votes }));
    saves.push(
      db
        .prepare(
          "INSERT OR IGNORE INTO championships(id,kind,period,start,end,candidates,results,winners,status,finalized) VALUES(?,'week',?,?,?, ?,?,?,'closed',?)",
        )
        .bind(
          "week:" + w,
          w,
          w,
          addDays(w, 6),
          JSON.stringify(counts.map((x) => x.phrase)),
          JSON.stringify(counts),
          JSON.stringify(top(counts)),
          day,
        ),
    );
  }
  await batches(db, saves);
  const earliest = await db
    .prepare("SELECT MIN(day) AS first FROM votes")
    .first();
  const first = earliest?.first?.slice(0, 7);
  if (!first) return;
  // Month-end weeks belong to the month containing their Sunday, including weeks crossing years.
  for (let m = first; m < day.slice(0, 7); m = monthNext(m)) {
    const start = monthNext(m) + "-01",
      end = addDays(start, 2);
    const weekly = await resultRows(
      db,
      "SELECT winners FROM championships WHERE kind='week' AND end>=? AND end<=?",
      m + "-01",
      monthEnd(m),
    );
    const candidates = [
      ...new Set(weekly.flatMap((x) => JSON.parse(x.winners))),
    ].sort((a, b) => a - b);
    await ensureSpecial(db, "month", m, start, end, candidates, day);
  }
  const firstYear = Number(first.slice(0, 4));
  for (let y = firstYear; y < Number(day.slice(0, 4)); y++) {
    const start = `${y + 1}-01-04`,
      end = `${y + 1}-01-10`;
    if (day < start) continue; // December finishes on January 3; never freeze yearly candidates early.
    const monthly = await resultRows(
      db,
      "SELECT winners FROM championships WHERE kind='month' AND period>=? AND period<=? AND finalized IS NOT NULL",
      `${y}-01`,
      `${y}-12`,
    );
    const candidates = [
      ...new Set(monthly.flatMap((x) => JSON.parse(x.winners))),
    ].sort((a, b) => a - b);
    await ensureSpecial(db, "year", String(y), start, end, candidates, day);
  }
  await db
    .prepare(
      "INSERT INTO festival_state(key,value) VALUES('reconciled',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    )
    .bind(day)
    .run();
}
async function ensureSpecial(db, kind, period, start, end, candidates, day) {
  const id = kind + ":" + period;
  await db
    .prepare(
      "INSERT OR IGNORE INTO championships(id,kind,period,start,end,candidates,results,winners,status,finalized) VALUES(?,?,?,?,?,?, '[]','[]',?,?)",
    )
    .bind(
      id,
      kind,
      period,
      start,
      end,
      JSON.stringify(candidates),
      candidates.length < 2 ? "insufficient" : "open",
      candidates.length < 2 ? day : null,
    )
    .run();
  if (day > end) {
    const counts = await resultRows(
      db,
      "SELECT phrase,COUNT(*) AS votes FROM festival_votes WHERE festival=? GROUP BY phrase ORDER BY votes DESC,phrase",
      id,
    );
    await db
      .prepare(
        "UPDATE championships SET results=?,winners=?,status='closed',finalized=? WHERE id=? AND finalized IS NULL",
      )
      .bind(JSON.stringify(counts), JSON.stringify(top(counts)), day, id)
      .run();
  }
}
export async function specialView(db, row) {
  if (!row) return null;
  const candidates = JSON.parse(row.candidates);
  const raw = row.finalized
    ? JSON.parse(row.results)
    : await resultRows(
        db,
        "SELECT phrase,COUNT(*) AS votes FROM festival_votes WHERE festival=? GROUP BY phrase",
        row.id,
      );
  const tally = new Map(raw.map((x) => [x.phrase, x.votes]));
  const counts = candidates.map((phrase) => ({
    phrase,
    votes: tally.get(phrase) || 0,
  }));
  return {
    id: row.id,
    kind: row.kind,
    period: row.period,
    start: row.start,
    end: row.end,
    candidates,
    counts,
    total: counts.reduce((s, x) => s + x.votes, 0),
    winners: JSON.parse(row.winners),
    status: row.status,
  };
}
export async function festivalListing(db, day, cursor) {
  const open = await db
    .prepare(
      "SELECT * FROM championships WHERE kind IN ('month','year') AND status='open' AND start<=? AND end>=? ORDER BY kind DESC LIMIT 1",
    )
    .bind(day, day)
    .first();
  const rows = await resultRows(
    db,
    "SELECT * FROM championships WHERE kind IN ('month','year') AND (finalized IS NOT NULL) AND id<? ORDER BY id DESC LIMIT 21",
    cursor || "z",
  );
  return {
    active: await specialView(db, open),
    archives: await Promise.all(
      rows.slice(0, 20).map((r) => specialView(db, r)),
    ),
    nextCursor: rows.length > 20 ? rows[19].id : null,
  };
}
