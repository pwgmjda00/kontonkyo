import { dailyIds, jstDay } from "../muka1-preview/catalog.js";

export default {
  async fetch(req, env) {
    const origin = "https://pwgmjda00.github.io";
    const headers = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    };
    const out = (v, status = 200) =>
      new Response(JSON.stringify(v), { status, headers });
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    const u = new URL(req.url);
    const day = jstDay();
    try {
      const admin =
        !!env.ADMIN_TOKEN &&
        req.headers.get("Authorization") === "Bearer " + env.ADMIN_TOKEN;
      if (u.pathname === "/submissions" && req.method === "POST") {
        if (req.headers.get("Origin") !== origin)
          return out({ error: "origin" }, 403);
        if (Number(req.headers.get("Content-Length")) > 2048)
          return out({ error: "size" }, 413);
        const raw = await req.text();
        if (raw.length > 2048) return out({ error: "size" }, 413);
        const b = JSON.parse(raw);
        const t = typeof b.text === "string" ? b.text.trim() : "";
        if (
          t.length < 5 ||
          t.length > 140 ||
          /@|https?:|www\./i.test(t) ||
          b.confirm !== true
        )
          return out({ error: "invalid" }, 400);
        const ip = req.headers.get("CF-Connecting-IP");
        if (!ip || !env.ADMIN_TOKEN) return out({ error: "unavailable" }, 503);
        const key = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(env.ADMIN_TOKEN),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );
        const bucket = Array.from(
          new Uint8Array(
            await crypto.subtle.sign(
              "HMAC",
              key,
              new TextEncoder().encode("submission:" + day + ":" + ip),
            ),
          ),
          (x) => x.toString(16).padStart(2, "0"),
        ).join("");
        const now = new Date().toISOString();
        const limit = await env.DB.prepare(
          "INSERT INTO submission_limits(day,bucket,n) VALUES(?,?,1) ON CONFLICT(day,bucket) DO UPDATE SET n=n+1 WHERE n<5",
        )
          .bind(day, bucket)
          .run();
        if (!limit.meta.changes) return out({ error: "rate limit" }, 429);
        const result = await env.DB.prepare(
          "INSERT INTO submissions(text,status,created) SELECT ?,'pending',? WHERE NOT EXISTS (SELECT 1 FROM submissions WHERE text=? AND status IN ('pending','approved')) AND (SELECT COUNT(*) FROM submissions WHERE status='pending')<500",
        )
          .bind(t, now, t)
          .run();
        if (!result.meta.changes)
          return out({ error: "duplicate or queue full" }, 409);
        return out({ accepted: true }, 201);
      }
      if (u.pathname === "/admin/submissions") {
        if (!admin) return out({ error: "unauthorized" }, 401);
        if (req.method === "GET") {
          const r = await env.DB.prepare(
            "SELECT id,text,created FROM submissions WHERE status='pending' ORDER BY id LIMIT 100",
          ).all();
          return out({ items: r.results });
        }
        if (req.method === "POST") {
          const b = await req.json();
          const t = typeof b.text === "string" ? b.text.trim() : "";
          if (
            !Number.isInteger(b.id) ||
            !["approved", "rejected"].includes(b.status) ||
            (b.status === "approved" &&
              (t.length < 5 || t.length > 140 || /@|https?:|www\./i.test(t)))
          )
            return out({ error: "invalid" }, 400);
          const r = await env.DB.prepare(
            "UPDATE submissions SET status=?,text=CASE WHEN ?='approved' THEN ? ELSE text END WHERE id=? AND status='pending'",
          )
            .bind(b.status, b.status, t, b.id)
            .run();
          return out({ updated: r.meta.changes === 1 });
        }
      }
      if (u.pathname === "/approved" && req.method === "GET") {
        const r = await env.DB.prepare(
          "SELECT id,text FROM submissions WHERE status='approved' ORDER BY id LIMIT 1000",
        ).all();
        return out({ items: r.results });
      }
      if (req.method === "GET" && u.pathname === "/history") {
        const yesterday = new Date(day + "T00:00:00Z");
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const prev = yesterday.toISOString().slice(0, 10);
        const monday = new Date(day + "T00:00:00Z");
        monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
        const end = monday.toISOString().slice(0, 10);
        const start = new Date(monday);
        start.setUTCDate(start.getUTCDate() - 84);
        const from = start.toISOString().slice(0, 10);
        const daily = await env.DB.prepare(
          "SELECT phrase,COUNT(*) votes FROM votes WHERE day=? GROUP BY phrase ORDER BY votes DESC,phrase",
        )
          .bind(prev)
          .all();
        const weeks = await env.DB.prepare(
          "WITH totals AS (SELECT date(day,'weekday 0','-6 days') AS week,phrase,COUNT(*) AS votes FROM votes WHERE day>=? AND day<? GROUP BY week,phrase), ranked AS (SELECT *,DENSE_RANK() OVER(PARTITION BY week ORDER BY votes DESC) AS pos FROM totals) SELECT week,phrase,votes FROM ranked WHERE pos=1 ORDER BY week DESC,phrase",
        )
          .bind(from, end)
          .all();
        return out({
          day: prev,
          winners: daily.results.filter(
            (x) => x.votes === daily.results[0]?.votes,
          ),
          weeks: weeks.results,
        });
      }
      if (req.method === "GET" && u.pathname === "/ranking") {
        const weekly = u.searchParams.get("period") === "week";
        const start = new Date(day + "T00:00:00Z");
        start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
        const from = start.toISOString().slice(0, 10);
        if (weekly) {
          const r = await env.DB.prepare(
            "SELECT phrase, COUNT(*) AS votes FROM votes WHERE day BETWEEN ? AND ? GROUP BY phrase ORDER BY votes DESC, phrase LIMIT 20",
          )
            .bind(from, day)
            .all();
          return out({ day, from, period: "week", ranking: r.results });
        }
        const r = await env.DB.prepare(
          "SELECT phrase, COUNT(*) AS votes FROM votes WHERE day=? GROUP BY phrase",
        )
          .bind(day)
          .all();
        const counts = new Map(r.results.map((x) => [x.phrase, x.votes]));
        return out({
          day,
          period: "day",
          ranking: dailyIds(day)
            .map((phrase) => ({ phrase, votes: counts.get(phrase) || 0 }))
            .sort((a, b) => b.votes - a.votes || a.phrase - b.phrase),
        });
      }
      if (req.method === "POST" && u.pathname === "/vote") {
        if (req.headers.get("Origin") !== origin)
          return out({ error: "origin" }, 403);
        if (Number(req.headers.get("Content-Length")) > 2048)
          return out({ error: "size" }, 413);
        const raw = await req.text();
        if (raw.length > 2048) return out({ error: "size" }, 413);
        const b = JSON.parse(raw);
        if (
          !Number.isInteger(b.phrase) ||
          b.phrase < 0 ||
          b.phrase > 255 ||
          !dailyIds(day).includes(b.phrase) ||
          typeof b.client !== "string" ||
          !/^[a-f0-9-]{36}$/.test(b.client)
        )
          return out({ error: "invalid" }, 400);
        const hash = Array.from(
          new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(day + ":" + b.client),
            ),
          ),
          (x) => x.toString(16).padStart(2, "0"),
        ).join("");
        const r = await env.DB.prepare(
          "INSERT OR IGNORE INTO votes(day,client,phrase) VALUES(?,?,?)",
        )
          .bind(day, hash, b.phrase)
          .run();
        return out({ accepted: r.meta.changes === 1 });
      }
      return out({ error: "not found" }, 404);
    } catch {
      return out({ error: "request failed" }, 400);
    }
  },
};
