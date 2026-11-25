// Analytics never stores IP addresses, user agents, URLs, free text, or client IDs.
const CLIENT_EVENTS = new Set([
  "visit",
  "duel_start",
  "duel_complete",
  "cup_start",
  "cup_complete",
  "host_create",
  "share_attempt",
  "invite_visit",
  "invite_complete",
]);
const SERVER_EVENTS = new Set(["daily_vote_accepted", "submission_accepted"]);
const MODES = new Set(["duel", "cup", "host", "gacha", "other"]);
const SOURCES = new Set(["x", "social", "invite", "direct", "unknown"]);
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const minuteBuckets = new Map(); // Isolate memory only; expires in one minute.
const MAX_BYTES = 16 * 1024;

function addDays(day, days) {
  const date = new Date(day + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function limited(req, count) {
  const now = Date.now();
  const bucket = req.headers.get("CF-Connecting-IP") || "unavailable";
  if (minuteBuckets.size >= 10000) {
    for (const [key, value] of minuteBuckets)
      if (value.until <= now) minuteBuckets.delete(key);
    if (minuteBuckets.size >= 10000 && !minuteBuckets.has(bucket)) return true;
  }
  let value = minuteBuckets.get(bucket);
  if (!value || value.until <= now) value = { n: 0, until: now + 60000 };
  value.n += count;
  minuteBuckets.set(bucket, value);
  return value.n > 120;
}

async function readBody(req) {
  if (Number(req.headers.get("Content-Length")) > MAX_BYTES) return null;
  if (!req.body) return null;
  const reader = req.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function validEvent(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  const keys = Object.keys(item);
  return (
    keys.every((key) =>
      ["id", "event", "mode", "source", "invite"].includes(key),
    ) &&
    UUID.test(item.id) &&
    CLIENT_EVENTS.has(item.event) &&
    MODES.has(item.mode) &&
    SOURCES.has(item.source) &&
    (item.invite === undefined ||
      item.invite === null ||
      UUID.test(item.invite))
  );
}

export async function pruneAnalytics(env, day) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM analytics_events WHERE day < ?").bind(
      addDays(day, -29),
    ),
    env.DB.prepare("DELETE FROM analytics_daily WHERE day < ?").bind(
      addDays(day, -89),
    ),
  ]);
}

async function save(env, day, events) {
  const now = new Date().toISOString();
  const statements = [];
  for (const item of events) {
    // D1 batch is transactional. Count only when the event ID is absent, then
    // insert its dedup record in the same transaction. Replays cannot increment.
    statements.push(
      env.DB.prepare(
        `
      INSERT INTO analytics_daily(day,event,mode,source,n)
      SELECT ?,?,?,?,1 WHERE NOT EXISTS(SELECT 1 FROM analytics_events WHERE id=?)
      ON CONFLICT(day,event,mode,source) DO UPDATE SET n=n+1
    `,
      ).bind(day, item.event, item.mode, item.source, item.id),
    );
    statements.push(
      env.DB.prepare(
        `
      INSERT OR IGNORE INTO analytics_events(id,day,time,event,mode,source,invite)
      VALUES(?,?,?,?,?,?,?)
    `,
      ).bind(
        item.id,
        day,
        now,
        item.event,
        item.mode,
        item.source,
        item.invite || null,
      ),
    );
  }
  statements.push(
    env.DB.prepare("DELETE FROM analytics_events WHERE day < ?").bind(
      addDays(day, -29),
    ),
  );
  statements.push(
    env.DB.prepare("DELETE FROM analytics_daily WHERE day < ?").bind(
      addDays(day, -89),
    ),
  );
  const results = await env.DB.batch(statements);
  let accepted = 0;
  for (let i = 1; i < events.length * 2; i += 2)
    accepted += results[i].meta.changes;
  return accepted;
}

export async function recordServerEvent(env, name, day, mode = null) {
  if (env.ANALYTICS_ENABLED === "false" || !SERVER_EVENTS.has(name)) return;
  try {
    await save(env, day, [
      {
        id: crypto.randomUUID(),
        event: name,
        mode: MODES.has(mode)
          ? mode
          : name === "daily_vote_accepted"
            ? "cup"
            : "other",
        source: "unknown",
      },
    ]);
  } catch {
    /* Analytics failure must never undo a vote or block the game. */
  }
}

const ratio = (a, b) => (b ? a / b : null);
export async function handleAnalytics(req, env, { day, admin, out }) {
  const url = new URL(req.url);
  if (url.pathname === "/analytics/events" && req.method === "POST") {
    if (env.ANALYTICS_ENABLED === "false")
      return out({ accepted: 0, enabled: false });
    let payload;
    try {
      payload = await readBody(req);
    } catch {
      return out({ error: "invalid analytics payload" }, 400);
    }
    if (payload === null)
      return out({ error: "analytics payload too large or empty" }, 413);
    if (
      !payload ||
      Object.keys(payload).some((key) => key !== "events") ||
      !Array.isArray(payload.events) ||
      !payload.events.length ||
      payload.events.length > 20 ||
      !payload.events.every(validEvent)
    )
      return out({ error: "invalid analytics event" }, 400);
    if (limited(req, payload.events.length))
      return out({ error: "analytics rate limit" }, 429);
    const accepted = await save(env, day, payload.events);
    return out({ accepted, enabled: true });
  }
  if (url.pathname !== "/admin/analytics") return null;
  if (!admin) return out({ error: "unauthorized" }, 401);
  if (req.method !== "GET") return out({ error: "method not allowed" }, 405);
  const period = url.searchParams.get("days") || "7";
  if (!["7", "30"].includes(period))
    return out({ error: "days must be 7 or 30" }, 400);
  const days = Number(period);
  const from = addDays(day, 1 - days);
  const [all, invites] = await env.DB.batch([
    env.DB.prepare(
      `SELECT day,event,mode,source,n FROM analytics_daily
      WHERE day BETWEEN ? AND ? ORDER BY day,event,mode,source`,
    ).bind(from, day),
    env.DB.prepare(
      `SELECT invite,
      SUM(CASE WHEN event='invite_visit' THEN 1 ELSE 0 END) visits,
      SUM(CASE WHEN event='invite_complete' THEN 1 ELSE 0 END) completions
      FROM analytics_events WHERE day BETWEEN ? AND ? AND invite IS NOT NULL
      AND event IN ('invite_visit','invite_complete') GROUP BY invite ORDER BY invite`,
    ).bind(from, day),
  ]);
  const totals = Object.fromEntries(
    [...CLIENT_EVENTS, ...SERVER_EVENTS].map((name) => [name, 0]),
  );
  const dailyMap = new Map(
    Array.from({ length: days }, (_, i) => [
      addDays(from, i),
      { day: addDays(from, i), visits: 0, completions: 0, shares: 0 },
    ]),
  );
  const bySource = {},
    byMode = {};
  for (const row of all.results) {
    totals[row.event] = (totals[row.event] || 0) + row.n;
    const record = dailyMap.get(row.day);
    if (row.event === "visit") record.visits += row.n;
    if (["duel_complete", "cup_complete"].includes(row.event))
      record.completions += row.n;
    if (row.event === "share_attempt") record.shares += row.n;
    (bySource[row.source] ||= {})[row.event] =
      ((bySource[row.source] || {})[row.event] || 0) + row.n;
    (byMode[row.mode] ||= {})[row.event] =
      ((byMode[row.mode] || {})[row.event] || 0) + row.n;
  }
  const completed = totals.duel_complete + totals.cup_complete;
  return out({
    days,
    from,
    through: day,
    enabled: env.ANALYTICS_ENABLED !== "false",
    daily: [...dailyMap.values()],
    totals,
    bySource,
    byMode,
    rates: {
      duelCompletion: ratio(totals.duel_complete, totals.duel_start),
      cupCompletion: ratio(totals.cup_complete, totals.cup_start),
      shareOperationsPerCompletion: ratio(totals.share_attempt, completed),
      inviteCompletionProxy: ratio(totals.invite_complete, completed),
      completionsPerInvite: ratio(
        totals.invite_complete,
        invites.results.length,
      ),
    },
    inviteCompletions: invites.results,
    retention: { rawDays: 30, aggregateDays: 90 },
    notes: [
      "訪問はイベント数です。ユニーク人数ではありません。",
      "率はイベント件数の比率です。分母0は未算出（null）。",
      "共有操作は投稿成功ではありません。",
      "招待経由完了数/全完了数は代理指標です。厳密なK係数ではありません。",
    ],
  });
}
