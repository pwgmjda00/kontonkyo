import {
  PHRASE_MAP,
  BUILTIN_IDS,
  dailyIds,
  duelIds,
  jstDay,
  validDay,
  submissionPhraseId,
} from "./catalog.js";
import {
  parseIds,
  modeFromQuery,
  validVotes,
  minorityTitle,
  shuffle,
} from "./core.js";
import { createPoster } from "./poster.js";

const API = window.MUKA_API || "";
const phrases = new Map(PHRASE_MAP);
const q = new URLSearchParams(location.search);
const mode = modeFromQuery(q);
const game = document.querySelector("#game");
const round = document.querySelector("#round");
const bar = document.querySelector("#bar");
const text = (id) => phrases.get(id) || "構文を読み込めませんでした";
const element = (tag, value, parent = game) => {
  const el = document.createElement(tag);
  el.textContent = value;
  parent.append(el);
  return el;
};
const status = (value, parent = game) => {
  const p = element("p", value, parent);
  p.setAttribute("role", "status");
  p.className = "notice";
  return p;
};
function button(label, action, parent = game, className = "") {
  const b = element("button", label, parent);
  b.className = className;
  b.onclick = async () => {
    try {
      await action(b);
    } catch {
      status("操作できませんでした。もう一度お試しください。", parent);
    }
  };
  return b;
}
function details(label, parent = game) {
  const d = element("details", "", parent);
  d.className = "more result-extra";
  element("summary", label, d);
  return d;
}
function cleanUrl(params = {}) {
  const u = new URL(location.href);
  u.search = "";
  u.hash = "";
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v)));
  return u;
}
function navigate(params) {
  location.href = cleanUrl(params).href;
}
function storeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
function uuid() {
  return crypto.randomUUID();
}
let memoryClientId;
function clientId() {
  if (memoryClientId) return memoryClientId;
  let id = storeGet("muka1-voter");
  if (!/^[a-f0-9-]{36}$/.test(id || "")) {
    id = uuid();
    storeSet("muka1-voter", id);
  }
  memoryClientId = id;
  return id;
}
const invite = /^[a-f0-9-]{36}$/.test(q.get("invite") || "")
  ? q.get("invite")
  : undefined;
const source = invite
  ? "invite"
  : /^(x|twitter)$/i.test(q.get("utm_source") || "")
    ? "x"
    : q.has("utm_source")
      ? "social"
      : document.referrer
        ? "unknown"
        : "direct";
const eventMode = ["nation", "duel", "challenge"].includes(mode)
  ? "duel"
  : ["cup", "host", "gacha"].includes(mode)
    ? mode
    : "other";
let analyticsOff = storeGet("muka1-analytics-off") === "1";
const opt = document.querySelector("#analytics-off");
opt.checked = analyticsOff;
opt.onchange = () => {
  analyticsOff = opt.checked;
  storeSet("muka1-analytics-off", analyticsOff ? "1" : "0");
};
function track(event) {
  if (!API || analyticsOff) return;
  const item = { id: uuid(), event, mode: eventMode, source };
  if (invite) item.invite = invite;
  fetch(API + "/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events: [item] }),
    keepalive: true,
  }).catch(() => {});
}
function completed(kind) {
  track(kind + "_complete");
  if (invite) track("invite_complete");
}
function invitedUrl(url) {
  const u = new URL(url);
  u.searchParams.set("invite", uuid());
  return u;
}
async function request(path, body) {
  if (!API) throw Error("offline");
  const res = await fetch(API + path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = Error(data.error || "request");
    err.status = res.status;
    throw err;
  }
  if (path.startsWith("/duel/")) {
    const pair = parseIds(data.pair?.join(","), 2, phrases);
    const counts = data.counts;
    if (
      !pair ||
      !validDay(data.day) ||
      !Array.isArray(counts) ||
      counts.length !== 2 ||
      new Set(counts.map((x) => x.phrase)).size !== 2 ||
      counts.some(
        (x) =>
          !pair.includes(x.phrase) ||
          !Number.isSafeInteger(x.votes) ||
          x.votes < 0,
      ) ||
      data.total !== counts.reduce((n, x) => n + x.votes, 0) ||
      typeof data.asOf !== "string" ||
      !Number.isFinite(Date.parse(data.asOf))
    )
      throw Error("invalid results");
  }
  return data;
}
async function copy(value, target = game) {
  try {
    await navigator.clipboard.writeText(value);
    status("コピーしました。DMやLINEに貼って送れます。", target);
  } catch {
    const input = element("textarea", value, target);
    input.readOnly = true;
    input.setAttribute("aria-label", "コピーする招待文");
    input.select();
    status("招待文を長押ししてコピーできます。", target);
  }
}
function shareActions(
  message,
  url,
  parent = game,
  retry = () => navigate({ duel: 1 }),
) {
  const actions = element("div", "", parent);
  actions.className = "result-actions";
  button(
    "他人を巻き込む",
    async () => {
      track("share_attempt");
      const u = invitedUrl(url);
      if (navigator.share) {
        try {
          await navigator.share({
            title: "MUKA-1",
            text: message,
            url: u.href,
          });
          return;
        } catch (e) {
          if (e.name === "AbortError") return;
        }
      }
      await copy(message + " " + u.href, actions);
    },
    actions,
    "primary",
  );
  button("もう一度遊ぶ", retry, actions);
  const extra = details("X・LINE・DMで送る", parent);
  button(
    "Xで審判を募集",
    () => {
      track("share_attempt");
      location.href =
        "https://twitter.com/intent/tweet?text=" +
        encodeURIComponent(message) +
        "&url=" +
        encodeURIComponent(invitedUrl(url).href);
    },
    extra,
  );
  button(
    "LINEに送る",
    () => {
      track("share_attempt");
      location.href =
        "https://line.me/R/msg/text/?" +
        encodeURIComponent(message + " " + invitedUrl(url).href);
    },
    extra,
  );
  button(
    "DM用の招待文をコピー",
    () => {
      track("share_attempt");
      return copy(message + " " + invitedUrl(url).href, extra);
    },
    extra,
  );
  return extra;
}
async function saveImage(canvas, filename, message = "", parent = game) {
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) {
    status("画像を生成できませんでした。", parent);
    return;
  }
  const file = new File([blob], filename, { type: "image/png" });
  const url = URL.createObjectURL(blob);
  const box = element("div", "", parent);
  const img = element("img", "", box);
  img.src = url;
  img.alt = "MUKA-1の共有用画像";
  img.className = "image-preview";
  const a = element(
    "a",
    "PNGを保存（iPhoneは画像の長押しでも保存できます）",
    box,
  );
  a.href = url;
  a.download = filename;
  button(
    "画像を共有",
    async () => {
      track("share_attempt");
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: message });
          return;
        } catch (e) {
          if (e.name === "AbortError") return;
        }
      }
      status("このブラウザでは画像を保存してから共有してください。", box);
    },
    box,
  );
  // The preview URL remains valid while the page is open, including iOS long-press.
  a.click();
}
function wrapText(ctx, value, x, y, maxWidth, maxHeight, preferred = 48) {
  const chars = [...value];
  let lines,
    size = preferred;
  do {
    ctx.font = "bold " + size + "px sans-serif";
    lines = [""];
    for (const ch of chars) {
      if (ctx.measureText(lines.at(-1) + ch).width > maxWidth) lines.push("");
      lines[lines.length - 1] += ch;
    }
    if (lines.length * size * 1.45 <= maxHeight) break;
    size -= 1;
  } while (size > 12);
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * size * 1.45));
}
function resultCanvas(heading, value, subtitle) {
  const cv = document.createElement("canvas");
  cv.width = 1200;
  cv.height = 800;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#fff200";
  ctx.fillRect(0, 0, 1200, 800);
  ctx.fillStyle = "#111";
  ctx.fillRect(30, 30, 1140, 110);
  ctx.fillStyle = "#fff";
  wrapText(ctx, heading, 60, 108, 1080, 85, 56);
  ctx.fillStyle = "#111";
  wrapText(ctx, value, 60, 230, 1080, 340, 54);
  ctx.font = "28px sans-serif";
  ctx.fillText(subtitle, 60, 660);
  ctx.fillText("架空構文の大会 ／ #MUKA1 ／ 賞金0円", 60, 725);
  return cv;
}

track("visit");
if (invite) track("invite_visit");
// Fetching user submissions never creates a million-element array.
let approvedWarning = "";
async function loadApproved() {
  if (!API) return;
  let after = null;
  try {
    do {
      const res = await fetch(
        API + "/approved" + (after === null ? "" : "?after=" + after),
        { signal: AbortSignal.timeout(1500) },
      );
      if (!res.ok) return;
      const data = await res.json();
      for (const item of data.items || []) {
        const id = submissionPhraseId(item.id);
        if (
          id === null ||
          typeof item.text !== "string" ||
          item.text.length > 140
        )
          continue;
        if (PHRASE_MAP.has(id)) {
          approvedWarning =
            "投稿データのIDが競合したため、その投稿の読み込みを停止しました。";
          continue;
        }
        phrases.set(id, item.text);
      }
      const cursor = data.nextCursor;
      if (!Number.isSafeInteger(cursor) || cursor <= (after || 0)) break;
      after = cursor;
    } while (true);
  } catch {}
}
// Most first visits can play immediately; old submission URLs wait for their texts.
const referenced = [q.get("cup"), q.get("pair")]
  .filter(Boolean)
  .join(",")
  .split(",")
  .filter((x) => /^\d+$/.test(x))
  .map(Number);
if (
  ["host", "gacha", "cup", "duel", "challenge"].includes(mode) ||
  referenced.some((id) => !PHRASE_MAP.has(id))
)
  await loadApproved();
else loadApproved();
if (approvedWarning) status(approvedWarning);
const allIds = () => [...phrases.keys()];
const cupDay = validDay(q.get("day")) ? q.get("day") : jstDay();
const rawCup = q.get("cup");
const parsedCup = parseIds(rawCup, 8, phrases);
let cupIds =
  parsedCup ||
  (q.has("daily") ? dailyIds(cupDay) : shuffle(allIds()).slice(0, 8));
const priorVotes = parseIds(q.get("p"), 7, phrases, false);
let queue = [...cupIds],
  next = [],
  choices = [],
  stage = 0;

let duelStarted = false;
function beginDuel(pair = shuffle(allIds()).slice(0, 2), national = null) {
  if (!duelStarted) {
    track("duel_start");
    duelStarted = true;
  }
  game.replaceChildren();
  bar.style.width = "0%";
  round.textContent = national
    ? national.day + " ／ 全国日替わり二択"
    : "一問だけの決闘";
  element("h2", "どっちが腹立つ？");
  pair.forEach((id, i) => {
    if (i) element("div", "VS").className = "vs";
    const b = button(
      (i ? "B：" : "A：") + text(id),
      async () => {
        completed("duel");
        if (national && national.readOnly) {
          renderNationalResult(national, null);
          return;
        }
        if (national && national.ready) {
          if (jstDay() !== national.day) {
            status("日付が変わりました。今日のお題を開き直してください。");
            button("今日の全国二択", () => navigate({ nation: 1 }));
            return;
          }
          game
            .querySelectorAll("button.choice")
            .forEach((el) => (el.disabled = true));
          try {
            const result = await request("/duel/vote", {
              day: national.day,
              pair,
              phrase: id,
              client: clientId(),
              analytics: !analyticsOff,
            });
            if (
              result.day !== national.day ||
              result.pair.join(",") !== pair.join(",")
            )
              throw Error("changed result");
            storeSet(
              "muka1-duel-" + national.day,
              String(result.selected ?? id),
            );
            renderNationalResult(result, result.selected ?? id);
          } catch (e) {
            if (e.status === 409) {
              status(
                "日付またはお題が変わりました。投票は送信されていません。",
              );
              button("今日のお題を確認", () => navigate({ nation: 1 }));
            } else {
              renderPrivateResult(
                pair,
                id,
                "全国投票は確認できませんでした。下の結果はこの端末の選択です。",
                national,
              );
            }
          }
        } else
          renderPrivateResult(
            pair,
            id,
            national
              ? "全国集計は取得できませんでした。この端末だけで遊んでいます。"
              : "",
            national,
          );
      },
      game,
      "choice",
    );
    b.dataset.phrase = String(id);
  });
  if (national?.readOnly) {
    game.querySelectorAll("button.choice").forEach((b) => (b.disabled = true));
    status("過去日の二択です。閲覧のみできます。");
    if (national.ready)
      button("実測の結果を見る", () => renderNationalResult(national, null));
  } else if (national && !national.ready)
    status("全国集計を確認中。すぐに選んでも、この端末で遊べます。");
  if (national?.ready && !national.readOnly)
    element("p", "選ぶまで全国の割合は表示しません。").className = "fine";
}
function renderPrivateResult(pair, id, note = "", national = null) {
  game.replaceChildren();
  bar.style.width = "100%";
  round.textContent = "あなたの判定";
  const prior = parseIds(q.get("pick"), 1, phrases)?.[0];
  const valid = pair.includes(prior);
  element(
    "h2",
    valid
      ? prior === id
        ? "意見が一致しました。"
        : "意見が割れました。"
      : "こっちの方が腹立つ。",
  );
  element("p", text(id));
  if (note) status(note);
  const historyRaw = q.get("jury");
  let history =
    typeof historyRaw === "string" && /^\d+(,\d+)*$/.test(historyRaw)
      ? historyRaw
          .split(",")
          .map(Number)
          .filter((v) => pair.includes(v))
          .slice(-19)
      : [];
  if (!history.length && valid) history.push(prior);
  history.push(id);
  const url = national
    ? cleanUrl({ nation: 1, day: national.day, pair: pair.join(",") })
    : cleanUrl({
        duel: 1,
        pair: pair.join(","),
        pick: id,
        jury: history.join(","),
      });
  const message =
    "どっちが腹立つ？\nA：" +
    text(pair[0]) +
    "\nB：" +
    text(pair[1]) +
    "\n" +
    (valid && prior !== id
      ? "意見が割れた。第三の審判を求む。"
      : "俺だけがおかしいのか確認したい。") +
    " #MUKA1";
  const extra = shareActions(message, url);
  if (!national)
    element(
      "p",
      "招待URLに記録された回答：A " +
        history.filter((v) => v === pair[0]).length +
        " ／ B " +
        history.filter((v) => v === pair[1]).length +
        "（自己申告のリレー履歴・全国票ではありません）",
      extra,
    ).className = "fine";
  button("7試合の大会へ", () => navigate({ random: 1 }), extra);
  button(
    "判定を画像にする",
    () =>
      saveImage(
        resultCanvas(
          "MUKA-1 ／ あなたの判定",
          text(id),
          "俺だけがおかしいのか？",
        ),
        "muka1-duel.png",
        message + " " + url.href,
        extra,
      ),
    extra,
  );
}
async function nationalDuel() {
  const requestedDay = q.get("day");
  const day = validDay(requestedDay) ? requestedDay : jstDay();
  if (day > jstDay()) {
    game.replaceChildren();
    status("未来の投票はまだ開催されていません。");
    button("今日の二択", () => navigate({ nation: 1 }));
    return;
  }
  const national = {
    day,
    pair: duelIds(day),
    ready: false,
    readOnly: day < jstDay(),
  };
  beginDuel(national.pair, national);
  if (requestedDay !== null && !validDay(requestedDay))
    status("日付が不正です。今日のお題を表示します。");
  let interacted = false;
  const onClick = () => {
    interacted = true;
  };
  game.addEventListener("click", onClick, { once: true });
  try {
    const data = await request("/duel/daily?day=" + encodeURIComponent(day));
    if (!parseIds(data.pair?.join(","), 2, phrases) || data.day !== day)
      throw Error("invalid");
    if (interacted) return;
    const expected = q.get("pair");
    const pairMismatch = expected && expected !== data.pair.join(",");
    data.ready = true;
    const stored = Number(storeGet("muka1-duel-" + day));
    if (storeGet("muka1-duel-" + day) !== null && data.pair.includes(stored))
      renderNationalResult(data, stored);
    else beginDuel(data.pair, data);
    if (pairMismatch)
      status("招待URLのお題が一致しません。公式のお題を表示します。");
  } catch {
    if (!interacted) {
      game.querySelector("[role=status]")?.remove();
      status("全国集計は取得不可。このまま端末内で遊べます。");
      if (national.readOnly) {
        game.querySelectorAll("button").forEach((b) => (b.disabled = true));
        button("今日の二択で遊ぶ", () => navigate({ nation: 1 }));
      }
    }
  } finally {
    game.removeEventListener("click", onClick);
  }
}
function renderNationalResult(data, selected) {
  game.replaceChildren();
  round.textContent = data.day + " ／ 全国の実測結果";
  bar.style.width = "100%";
  const counts = new Map(
    (data.counts || []).map((x) => [x.phrase, Number(x.votes) || 0]),
  );
  const total = data.pair.reduce((n, id) => n + (counts.get(id) || 0), 0);
  const chosen = counts.get(selected) || 0;
  const p = total ? (chosen / total) * 100 : 0;
  element(
    "h2",
    selected === null
      ? total
        ? "この日の判定"
        : "まだ0票。王者なし。"
      : minorityTitle(chosen, total),
  );
  if (selected !== null) {
    element("p", "あなたの選択：" + text(selected));
    element("p", "称号はお遊びです。人格の評価ではありません。").className =
      "fine";
  }
  data.pair.forEach((id, i) =>
    element(
      "p",
      (i ? "B：" : "A：") +
        text(id) +
        "\n" +
        (counts.get(id) || 0) +
        "票 ／ " +
        (total ? (((counts.get(id) || 0) / total) * 100).toFixed(1) : "0.0") +
        "%",
    ),
  );
  element(
    "p",
    "合計 " +
      total +
      "票 ／ 集計 " +
      (data.asOf
        ? new Date(data.asOf).toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
          }) + " JST"
        : "取得時点"),
  ).className = "fine";
  if (data.accepted === false)
    status("この端末は投票済みです。最初の選択を表示しています。");
  if (data.day < jstDay()) status("過去日の結果です。投票は終了しました。");
  const aPercent = total ? ((counts.get(data.pair[0]) || 0) / total) * 100 : 0;
  const aVotes = counts.get(data.pair[0]) || 0;
  const close =
    total >= 30 && aVotes * 100 >= total * 45 && aVotes * 100 <= total * 55;
  const message =
    (close
      ? "接戦速報。誰か決着つけてくれ。"
      : selected !== null && total >= 30 && p < 45
        ? "俺そんなに少数派なの？"
        : "どっちが腹立つ？全国の審判を求む。") +
    " " +
    data.day +
    " ／ A " +
    (counts.get(data.pair[0]) || 0) +
    "票・B " +
    (counts.get(data.pair[1]) || 0) +
    "票（" +
    total +
    "票、A " +
    aPercent.toFixed(1) +
    "%） #MUKA1";
  const url = cleanUrl({ nation: 1, day: data.day, pair: data.pair.join(",") });
  shareActions(message, url);
}

function renderCup() {
  game.replaceChildren();
  bar.style.width = (choices.length / 7) * 100 + "%";
  const custom = (q.get("title") || "").trim().slice(0, 40);
  if (custom && parsedCup && !q.has("daily"))
    element("p", custom).className = "kicker";
  if (queue.length === 1 && !next.length) {
    completed("cup");
    renderCupResult(queue[0], custom);
    return;
  }
  round.textContent =
    (q.has("daily") ? cupDay + " ／ " : "") +
    ["準々決勝", "準決勝", "決勝"][stage] +
    " ／ " +
    (choices.length + 1) +
    "/7";
  element("h2", "どっちがムカつく？");
  queue.slice(0, 2).forEach((id, i) => {
    if (i) element("div", "VS").className = "vs";
    const b = button(
      (i ? "B選手：" : "A選手：") + text(id),
      () => {
        choices.push(id);
        next.push(id);
        queue.splice(0, 2);
        if (!queue.length) {
          queue = next;
          next = [];
          stage++;
        }
        renderCup();
      },
      game,
      "choice",
    );
    b.dataset.phrase = String(id);
  });
}
function renderCupResult(winner, custom) {
  round.textContent = "最悪が決まりました";
  element("h2", text(winner));
  const params = { cup: cupIds.join(","), p: choices.join(",") };
  if (q.has("daily")) {
    params.daily = 1;
    params.day = cupDay;
  } else if (custom) params.title = custom;
  const url = cleanUrl(params);
  let message =
    "俺が選んだ最悪の一文：" +
    text(winner) +
    " 俺だけがおかしいのか確認したい。 #MUKA1";
  const priorValid = validVotes(priorVotes, cupIds);
  if (priorValid) {
    const same = choices
      .slice(0, 4)
      .filter((id, i) => id === priorVotes[i]).length;
    message =
      "初戦の感性一致率 " + same * 25 + "%。第三者の意見を求む。 #MUKA1";
    element(
      "p",
      "初戦の感性一致：" +
        same +
        "/4 ／ 優勝構文：" +
        (winner === priorVotes[6] ? "一致" : "不一致"),
    );
  }
  const extra = shareActions(message, url, game, () => navigate({ random: 1 }));
  if (q.has("daily") && cupIds.join(",") === dailyIds(cupDay).join(",")) {
    if (cupDay !== jstDay())
      element(
        "p",
        "この日の日替わり大会は終了しました。全国投票は閲覧のみです。",
        extra,
      );
    else
      button(
        "今日の全国大会票を送る",
        async (b) => {
          b.disabled = true;
          if (cupDay !== jstDay()) {
            status(
              "日付が変わりました。今日の大会を開き直してください。",
              extra,
            );
            return;
          }
          try {
            const d = await request("/vote", {
              phrase: winner,
              client: clientId(),
              day: cupDay,
              analytics: !analyticsOff,
            });
            status(
              d.accepted ? "投票しました。" : "この端末は今日は投票済みです。",
              extra,
            );
          } catch (e) {
            status(
              e.status === 409
                ? "日付が変わったため投票しませんでした。"
                : "全国投票を確認できませんでした。再試行できます。",
              extra,
            );
            b.disabled = false;
          }
        },
        extra,
      );
  }
  const recap = details("大会の記録・画像", game);
  const runner = choices[4] === winner ? choices[5] : choices[4];
  element("p", "準優勝：" + text(runner), recap);
  const types = [
    ["上から目線検知型", /普通|常識|レベル|理解|分か|わか|教え|勉強/],
    ["自己責任アレルギー型", /努力|責任|甘え|言い訳|行動/],
    ["偽善検知型", /優し|正義|幸せ|感謝|善|思いやり/],
    ["マウント過敏型", /年収|才能|勝|成功|自慢|嫉妬/],
  ];
  const scores = types
    .map(([name, re]) => ({
      name,
      n: choices.filter((id) => re.test(text(id))).length,
    }))
    .sort((a, b) => b.n - a.n);
  const type = scores[0].n ? scores[0].name : "全方位ムカつき型";
  element("p", "本日の称号：" + type + "（お遊び診断）", recap);
  button(
    "称号カードを画像にする",
    () =>
      saveImage(
        resultCanvas("MUKA-1 認定証", type, "架空構文7試合によるお遊び診断"),
        "muka1-title.png",
        message + " " + url.href,
        recap,
      ),
    recap,
  );
  button(
    "ムカつき免許証を発行",
    () =>
      saveImage(
        resultCanvas(
          "ムカつき免許証",
          text(winner),
          "資格：架空構文審査員 ／ 効力：特になし",
        ),
        "muka1-license.png",
        message + " " + url.href,
        recap,
      ),
    recap,
  );
  button(
    "地獄の号外を画像にする",
    () =>
      saveImage(
        resultCanvas(
          "地獄の号外 ／ 個人大会優勝",
          text(winner),
          "俺だけがおかしいのか？",
        ),
        "muka1.png",
        message + " " + url.href,
        recap,
      ),
    recap,
  );
  button("大会URLをコピー", () => copy(invitedUrl(url).href, recap), recap);
  if (priorValid) {
    for (let i = 0; i < 4; i++) {
      element(
        "p",
        "第" +
          (i + 1) +
          "試合：" +
          (choices[i] === priorVotes[i] ? "一致" : "不一致") +
          " ／ あなた：" +
          text(choices[i]) +
          " ／ 相手：" +
          text(priorVotes[i]),
        recap,
      );
      if (choices[i] !== priorVotes[i])
        button(
          "第" + (i + 1) + "試合の第三者を募集",
          () => {
            track("share_attempt");
            return copy(
              "意見が割れた。第三の審判を求む。 #MUKA1 " +
                invitedUrl(
                  cleanUrl({
                    duel: 1,
                    pair: cupIds.slice(i * 2, i * 2 + 2).join(","),
                    pick: choices[i],
                    jury: [priorVotes[i], choices[i]].join(","),
                  }),
                ).href,
              recap,
            );
          },
          recap,
        );
    }
  }
}
function host() {
  game.replaceChildren();
  round.textContent = "地獄大会を主催";
  const chosen = new Set();
  const themes = [
    ["意識高い系最悪決定戦", /成長|努力|行動|投資|豊か|本質|価値|自分/],
    [
      "職場で言われたくない言葉選手権",
      /仕事|対応|確認|共有|説明|作業|認識|判断|質問/,
    ],
    ["恋愛めんどくさいグランプリ", /恋愛|返信|連絡|誘|付き合|既読|好き|優先/],
    ["哲学かぶれ頂上決戦", /本質|矛盾|自由|常識|幸せ|意味|答え|正解/],
    ["自虐風自慢日本代表選考会", /自慢|褒め|才能|評価|困る|苦手|普通|申し訳/],
  ];
  const theme = element("select", "");
  theme.setAttribute("aria-label", "大会テーマ");
  theme.append(new Option("テーマを選ぶ（任意）", ""));
  themes.forEach(([name], i) => theme.append(new Option(name, String(i))));
  const name = element("input", "");
  name.maxLength = 40;
  name.placeholder = "大会名（任意・個人名は入れない）";
  name.setAttribute("aria-label", "大会名");
  const auto = button("テーマから8構文を選ぶ", () => {
    if (theme.value === "") {
      info.textContent = "テーマを選んでください";
      return;
    }
    const matches = allIds().filter((id) =>
      themes[Number(theme.value)][1].test(text(id)),
    );
    if (matches.length < 8) {
      info.textContent = "候補が8件未満です";
      return;
    }
    name.value = themes[Number(theme.value)][0];
    chosen.clear();
    shuffle(matches)
      .slice(0, 8)
      .forEach((id) => chosen.add(id));
    search.value = "";
    refresh();
  });
  const info = status("");
  const search = element("input", "");
  search.placeholder = "構文を検索";
  search.setAttribute("aria-label", "構文を検索");
  const list = element("div", "");
  list.className = "host-list";
  const params = () => ({
    cup: [...chosen].join(","),
    ...(name.value.trim() ? { title: name.value.trim() } : {}),
  });
  const launch = button(
    "大会を開催",
    () => {
      if (chosen.size === 8) {
        track("host_create");
        navigate(params());
      }
    },
    game,
    "primary",
  );
  const poster = button("大会告知画像を作る", async (b) => {
    if (chosen.size !== 8) {
      info.textContent = "8構文を選んでください";
      return;
    }
    b.disabled = true;
    try {
      track("host_create");
      const url = invitedUrl(cleanUrl(params()));
      const title = name.value.trim() || "ムカつくツイートグランプリ";
      const cv = await createPoster({
        title,
        ids: [...chosen],
        phrases,
        url: url.href,
      });
      await saveImage(
        cv,
        "muka1-poster.png",
        title + " 開催。審判求む。 #MUKA1 " + url.href,
      );
    } finally {
      b.disabled = false;
    }
  });
  function refresh() {
    info.textContent =
      "選出 " + chosen.size + "/8 ／ 全" + phrases.size + "構文";
    launch.disabled = chosen.size !== 8;
    poster.disabled = chosen.size !== 8;
    list.replaceChildren();
    for (const id of allIds().filter((id) => text(id).includes(search.value))) {
      const label = element("label", "", list);
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = chosen.has(id);
      cb.disabled = chosen.size === 8 && !cb.checked;
      cb.dataset.phrase = String(id);
      cb.onchange = () => {
        if (cb.checked && chosen.size < 8) chosen.add(id);
        else chosen.delete(id);
        refresh();
      };
      label.append(cb, document.createTextNode(text(id)));
    }
  }
  search.oninput = refresh;
  refresh();
}
function gacha() {
  game.replaceChildren();
  round.textContent = "ムカつきガチャ";
  const ids = allIds(),
    id = ids[Math.floor(Math.random() * ids.length)];
  element("h2", text(id));
  shareActions(
    "今日引いた架空構文：" + text(id) + " #MUKA1",
    cleanUrl({ gacha: 1 }),
    game,
    gacha,
  );
}
async function festivalPage(id) {
  game.replaceChildren();
  round.textContent = "特別大会";
  status("実票を確認中…");
  try {
    const data = await request(
      "/festival" + (id ? "?id=" + encodeURIComponent(id) : ""),
    );
    const f = id
      ? data.festival ||
        [data.active, ...(data.archives || [])]
          .filter(Boolean)
          .find((item) => item.id === id)
      : data.active;
    if (!f) {
      game.replaceChildren();
      status("開催中の特別大会はありません。");
      button("全国二択へ", () => navigate({ nation: 1 }));
      return;
    }
    renderFestival(f);
  } catch {
    game.replaceChildren();
    status("特別大会の集計は取得できませんでした。");
    button("二択で遊ぶ", () => navigate({ duel: 1 }));
  }
}
function renderFestival(f, selected = null) {
  game.replaceChildren();
  round.textContent =
    f.period +
    " ／ " +
    (f.kind === "year" ? "年間王者決定戦" : "月間王者決定戦");
  element(
    "h2",
    f.kind === "year" ? "今年の最悪を決めよう" : "この月の最悪を決めよう",
  );
  const open = f.status === "open";
  const counts = new Map((f.counts || []).map((x) => [x.phrase, x.votes]));
  f.candidates.forEach((id) => {
    if (open && selected === null)
      button(
        text(id),
        async (b) => {
          game.querySelectorAll("button").forEach((el) => (el.disabled = true));
          try {
            const r = await request("/festival/vote", {
              id: f.id,
              phrase: id,
              client: clientId(),
              analytics: !analyticsOff,
            });
            renderFestival(r, r.selected ?? id);
            if (r.accepted === false)
              status("この端末は投票済みです。最初の選択を表示しています。");
          } catch {
            status("投票を確認できませんでした。再試行できます。");
            game
              .querySelectorAll("button")
              .forEach((el) => (el.disabled = false));
          }
        },
        game,
        "choice",
      );
    else
      element(
        "p",
        text(id) +
          " ／ " +
          (counts.get(id) || 0) +
          "票" +
          (id === selected ? "（あなたの選択）" : ""),
      );
  });
  if (!open || selected !== null) {
    element("p", "合計 " + (f.total || 0) + "票");
    if (!f.total && !open) status("0票のため王者なし。");
    else if (f.winners?.length)
      element("p", "王者：" + f.winners.map(text).join(" ／ "));
    shareActions(
      f.period +
        "の架空構文王者を決めよう。実測 " +
        (f.total || 0) +
        "票。 #MUKA1",
      cleanUrl({ festival: f.id }),
    );
  } else
    element(
      "p",
      "投票期間 " + f.start + "〜" + f.end + "（日本時間）",
    ).className = "fine";
  if (f.status === "insufficient")
    status("候補不足のため、この大会は不成立です。");
}
async function festivalBanner() {
  if (!API || mode === "festival") return;
  try {
    const d = await request("/festival");
    if (!d.active || d.active.status !== "open") return;
    const box = document.querySelector("#festival-banner");
    box.hidden = false;
    element(
      "p",
      d.active.period +
        "の" +
        (d.active.kind === "year" ? "年間" : "月間") +
        "王者決定戦を開催中。",
      box,
    );
    const a = element("a", "特別大会に参加する", box);
    a.href = cleanUrl({ festival: d.active.id }).href;
  } catch {}
}
document.querySelectorAll("nav a").forEach((a) => {
  if (modeFromQuery(new URL(a.href).searchParams) === mode)
    a.setAttribute("aria-current", "page");
});
if (mode === "nation") nationalDuel();
else if (mode === "duel") {
  const pair = parseIds(q.get("pair"), 2, phrases);
  beginDuel(pair || undefined);
  if (q.has("pair") && !pair)
    status("招待URLのお題が不正なため、別の二択を表示します。");
} else if (mode === "challenge") {
  beginDuel(dailyIds(jstDay()).slice(0, 2));
} else if (mode === "host") host();
else if (mode === "gacha") gacha();
else if (mode === "festival") festivalPage(q.get("festival"));
else {
  track("cup_start");
  renderCup();
  if (rawCup && !parsedCup)
    status("大会URLのお題が不正なため、新しい大会を表示します。");
}
festivalBanner();
