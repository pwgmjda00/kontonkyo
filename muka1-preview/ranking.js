import { createPool, loadApproved } from "./pages.js";
const pool = createPool();
const s = document.querySelector("#status");
const weekly = new URLSearchParams(location.search).get("period") === "week";
(async () => {
  try {
    await loadApproved(pool);
    if (!window.MUKA_API) throw Error();
    const r = await fetch(
      window.MUKA_API + "/ranking" + (weekly ? "?period=week" : ""),
    );
    if (!r.ok) throw Error();
    const d = await r.json();
    if (weekly && d.period !== "week") throw Error();
    s.textContent =
      (weekly ? d.from + "〜" : "") +
      d.day +
      " ／ " +
      (d.ranking.some((x) => x.votes > 0)
        ? weekly
          ? "週間 TOP20"
          : "日替わり大会 TOP8"
        : "まだ投票がありません");
    let i = 0,
      rank = 0,
      last = null;
    for (const x of d.ranking.slice(0, weekly ? 20 : 8)) {
      if (!Number.isInteger(x.phrase) || typeof pool.get(x.phrase) !== "string")
        continue;
      const li = document.createElement("li");
      i++;
      if (x.votes !== last) {
        rank = i;
        last = x.votes;
      }
      const label = document.createElement("span");
      label.className = "rank";
      label.textContent =
        x.votes > 0
          ? ["", "🥇 第1位", "🥈 第2位", "🥉 第3位"][rank] || "第" + rank + "位"
          : "未得票";
      if (x.votes > 0 && rank <= 3)
        li.className = "framed " + ["", "gold", "silver", "bronze"][rank];
      const phrase = document.createElement("div");
      phrase.textContent = pool.get(x.phrase);
      const votes = document.createElement("span");
      votes.className = "votes";
      votes.textContent = x.votes + "票";
      li.append(label, phrase, votes);
      document.querySelector("#list").append(li);
    }
  } catch {
    s.textContent =
      "集計を取得できません。時間をおいて再読み込みしてください。";
  }
})();
