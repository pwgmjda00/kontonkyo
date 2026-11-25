import { createPool, loadApproved } from "./pages.js";
const pool = createPool();
function frame(parent, x, label) {
  if (typeof pool.get(x.phrase) !== "string") return;
  const a = document.createElement("article");
  const s = document.createElement("small");
  s.textContent = label + " ／ " + x.votes + "票";
  const p = document.createElement("strong");
  p.textContent = pool.get(x.phrase);
  a.append(s, p);
  parent.append(a);
  return a;
}
async function share(x, day) {
  const cv = document.createElement("canvas");
  cv.width = 1200;
  cv.height = 630;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#fff200";
  ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = "#111";
  ctx.font = "bold 65px sans-serif";
  ctx.fillText("全国号外 ／ MUKA-1", 55, 100);
  ctx.font = "30px sans-serif";
  ctx.fillText(day + " ／ " + x.votes + "票", 55, 170);
  ctx.font = "bold 44px sans-serif";
  let line = "",
    y = 250;
  for (const ch of pool.get(x.phrase)) {
    if (ctx.measureText(line + ch).width > 1080) {
      ctx.fillText(line, 55, y);
      line = "";
      y += 55;
    }
    line += ch;
  }
  ctx.fillText(line, 55, y);
  ctx.font = "25px sans-serif";
  ctx.fillText("架空構文の全国投票 #MUKA1", 55, 585);
  cv.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], "muka1-news.png", { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: "#MUKA1 " + new URL("./", location.href).href,
        });
        return;
      }
    } catch (e) {
      if (e.name === "AbortError") return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
}
(async () => {
  const status = document.querySelector("#status");
  try {
    await loadApproved(pool);
    const r = await fetch(window.MUKA_API + "/history");
    if (!r.ok) throw Error();
    const d = await r.json();
    status.textContent =
      d.day + " の確定結果" + (d.winners.length ? "" : " ／ 投票なし");
    for (const x of d.winners) {
      const a = frame(
        document.querySelector("#daily"),
        x,
        d.winners.length > 1 ? "共同優勝" : "優勝",
      );
      if (a) {
        const b = document.createElement("button");
        b.textContent = "号外を画像にする";
        b.onclick = () => share(x, d.day);
        a.append(b);
      }
    }
    for (const x of d.weeks)
      frame(document.querySelector("#weeks"), x, x.week + " 週の優勝");
    if (!d.weeks.length)
      document.querySelector("#weeks").textContent =
        "まだ確定した週間優勝はありません。";
  } catch {
    status.textContent = "履歴APIは準備中、または通信できません。";
  }
})();
