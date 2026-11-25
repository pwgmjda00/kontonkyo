import {
  PHRASE_MAP,
  BUILTIN_IDS,
  dailyIds,
  jstDay,
  submissionPhraseId,
} from "./catalog.js";
import { parseIds, validVotes } from "./core.js";
(async () => {
  const API = window.MUKA_API || "";
  const phrases = new Map(PHRASE_MAP);
  const approved = [];
  if (API) {
    try {
      const res = await fetch(API + "/approved", {
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const d = await res.json();
        for (const x of Array.isArray(d.items) ? d.items : []) {
          const id = submissionPhraseId(x.id);
          if (
            id !== null &&
            typeof x.text === "string" &&
            x.text.length <= 140 &&
            !PHRASE_MAP.has(id)
          ) {
            phrases.set(id, x.text);
            approved.push(id);
          }
        }
      }
    } catch {}
  }
  const candidates = BUILTIN_IDS.concat(approved);
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function daily() {
    return dailyIds(jstDay());
  }
  const q = new URLSearchParams(location.search),
    raw = q.get("cup"),
    parsed = parseIds(raw, 8, phrases);
  const defaultDuel = ![
    "gacha",
    "challenge",
    "host",
    "duel",
    "daily",
    "cup",
    "random",
  ].some((key) => q.has(key));
  let ids =
    parsed ||
    (q.has("daily") ? daily() : shuffle(candidates.slice()).slice(0, 8));
  let queue = ids.slice(),
    next = [],
    votes = [],
    stage = 0,
    choices = [];
  const game = document.querySelector("#game"),
    round = document.querySelector("#round");
  function record(k) {
    try {
      const key = "muka1-local-stats";
      let s = JSON.parse(localStorage.getItem(key) || "{}");
      s[k] = (Number(s[k]) || 0) + 1;
      localStorage.setItem(key, JSON.stringify(s));
    } catch {}
  }
  record("visits");
  if (q.has("pick") || q.has("p")) record("inviteVisits");
  function button(s, f) {
    let b = document.createElement("button");
    b.textContent = s;
    b.onclick = () => {
      if (s === "他人を巻き込む" || s === "Xで審判を募集")
        record("shareAttempts");
      f();
    };
    if (s === "他人を巻き込む") b.className = "primary";
    game.append(b);
    return b;
  }
  function choiceButton(label, id, action) {
    const b = button(label, action);
    b.classList.add("choice");
    b.dataset.phrase = String(id);
    return b;
  }
  let memoryClient;
  function voterClient() {
    if (memoryClient) return memoryClient;
    try {
      memoryClient = localStorage.getItem("muka1-voter");
    } catch {}
    if (!/^[a-f0-9-]{36}$/.test(memoryClient || "")) {
      memoryClient = crypto.randomUUID();
      try {
        localStorage.setItem("muka1-voter", memoryClient);
      } catch {}
    }
    return memoryClient;
  }
  function duel() {
    game.replaceChildren();
    const pair =
      parseIds(q.get("pair"), 2, phrases) ||
      shuffle(candidates.slice()).slice(0, 2);
    round.textContent = "一問だけの決闘";
    document.querySelector("#bar").style.width = "0%";
    let h = document.createElement("h2");
    h.textContent = "どっちが腹立つ？";
    game.append(h);
    pair.forEach((id, i) =>
      choiceButton((i ? "B：" : "A：") + phrases.get(id), id, () => {
        record("duelCompleted");
        game.replaceChildren();
        document.querySelector("#bar").style.width = "100%";
        let prior = q.get("pick"),
          valid =
            prior !== null &&
            /^\d+$/.test(prior) &&
            pair.includes(Number(prior));
        let title = document.createElement("h2");
        title.textContent = valid
          ? Number(prior) === id
            ? "意見が一致しました。"
            : "意見が割れました。"
          : "審判を募集します。";
        game.append(title);
        let p = document.createElement("p");
        p.textContent = "あなたの選択：" + phrases.get(id);
        game.append(p);
        let u = new URL(location.href);
        u.search = "";
        u.searchParams.set("duel", "1");
        u.searchParams.set("pair", pair.join(","));
        u.searchParams.set("pick", id);
        let history = (q.get("jury") || "")
          .split(",")
          .filter((v) => /^\d+$/.test(v) && pair.includes(Number(v)))
          .slice(-19)
          .map(Number);
        if (!history.length && valid) history.push(Number(prior));
        history.push(id);
        u.searchParams.set("jury", history.join(","));
        let tally = document.createElement("p");
        tally.textContent =
          "この招待リレー内の票：A " +
          history.filter((v) => v === pair[0]).length +
          " ／ B " +
          history.filter((v) => v === pair[1]).length +
          "（全国集計ではありません）";
        game.append(tally);
        if (valid && Number(prior) !== id) {
          const summon = document.createElement("h2");
          summon.textContent = "緊急招集：第三の審判";
          game.append(summon);
          const note = document.createElement("p");
          note.textContent =
            "意見が割れました。次の審判にこの二択を送りつけよう。";
          game.append(note);
          button("第三者への挑戦状をコピー", async () => {
            const text =
              "意見が割れた。どっちが腹立つか判定してくれ。 #MUKA1 " + u.href;
            try {
              await navigator.clipboard.writeText(text);
              note.textContent = "挑戦状をコピーしました。";
            } catch {
              prompt("挑戦状をコピー", text);
            }
          });
        }
        let msg =
          "どっちが腹立つ？\nA：" +
          phrases.get(pair[0]) +
          "\nB：" +
          phrases.get(pair[1]) +
          "\n" +
          (valid && Number(prior) !== id
            ? "友達と意見割れた。マジでどっち？"
            : "こっちの方が腹立つと思うんだけど俺だけ？") +
          " #MUKA1";
        button("他人を巻き込む", async () => {
          if (navigator.share) {
            try {
              await navigator.share({ text: msg, url: u.href });
              return;
            } catch (e) {
              if (e.name === "AbortError") return;
            }
          }
          location.href =
            "https://twitter.com/intent/tweet?text=" +
            encodeURIComponent(msg) +
            "&url=" +
            encodeURIComponent(u.href);
        });
        button(
          "Xで審判を募集",
          () =>
            (location.href =
              "https://twitter.com/intent/tweet?text=" +
              encodeURIComponent(msg) +
              "&url=" +
              encodeURIComponent(u.href)),
        );
        button("友達に直接送る", async () => {
          const message =
            "これ、どっちが腹立つ？ 私は" +
            (id === pair[0] ? "A" : "B") +
            "派。 " +
            u.href;
          record("shareAttempts");
          try {
            await navigator.clipboard.writeText(message);
            const notice = document.createElement("p");
            notice.setAttribute("role", "status");
            notice.textContent =
              "挑戦状をコピーしたよ。DMやLINEに貼って送ろう。";
            game.append(notice);
          } catch {
            prompt("挑戦状をコピー", message);
          }
        });
        button(
          "別の二択",
          () => (location.href = location.pathname + "?duel=1"),
        );
        button(
          "7試合の大会へ",
          () => (location.href = location.pathname + "?random=1"),
        );
      }),
    );
  }
  function render() {
    game.replaceChildren();
    const custom = (q.get("title") || "").trim().slice(0, 40);
    if (custom && q.has("cup") && !q.has("daily")) {
      const heading = document.createElement("h2");
      heading.textContent = custom;
      game.append(heading);
    }
    document.querySelector("#bar").style.width = (votes.length / 7) * 100 + "%";
    if (queue.length === 1 && next.length === 0) {
      record("cupCompleted");
      let winner = queue[0];
      round.textContent = "最悪が決まりました";
      let label = document.createElement("small");
      label.textContent = "あなたが選んだ本日の最悪";
      game.append(label);
      let h = document.createElement("h2");
      h.textContent = phrases.get(winner);
      game.append(h);
      let runner = choices[4] === winner ? choices[5] : choices[4];
      let recap = document.createElement("p");
      recap.textContent = "準優勝：" + phrases.get(runner);
      game.append(recap);
      const badge = document.createElement("p");
      const types = [
        ["上から目線検知型", /普通|常識|レベル|理解|分か|わか|教え|勉強/],
        ["自己責任アレルギー型", /努力|責任|甘え|言い訳|行動/],
        ["偽善検知型", /優し|正義|幸せ|感謝|善|思いやり/],
        ["マウント過敏型", /年収|才能|勝|成功|自慢|嫉妬/],
      ];
      const scores = types
        .map(([name, re]) => ({
          name,
          n: choices.filter((id) => re.test(phrases.get(id))).length,
        }))
        .sort((a, b) => b.n - a.n);
      const type = scores[0].n ? scores[0].name : "全方位ムカつき型";
      badge.textContent = "本日の称号：" + type + "（お遊び診断）";
      game.append(badge);
      button("称号カードを画像にする", () => {
        const cv = document.createElement("canvas");
        cv.width = 1000;
        cv.height = 630;
        const x = cv.getContext("2d");
        x.fillStyle = "#fff200";
        x.fillRect(0, 0, 1000, 630);
        x.strokeStyle = "#111";
        x.lineWidth = 12;
        x.strokeRect(25, 25, 950, 580);
        x.fillStyle = "#111";
        x.font = "bold 48px sans-serif";
        x.fillText("MUKA-1 認定証", 65, 115);
        x.font = "bold 60px sans-serif";
        x.fillText(type, 65, 310);
        x.font = "28px sans-serif";
        x.fillText("架空構文7試合によるお遊び診断", 65, 420);
        x.font = "24px sans-serif";
        x.fillText("効力：特になし ／ #MUKA1", 65, 535);
        cv.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], "muka1-title.png", {
            type: "image/png",
          });
          try {
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({
                files: [file],
                text:
                  "本日の称号：" +
                  type +
                  " #MUKA1 " +
                  location.origin +
                  location.pathname,
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
        }, "image/png");
      });
      button(
        "称号をXに貼る",
        () =>
          (location.href =
            "https://twitter.com/intent/tweet?text=" +
            encodeURIComponent(
              "本日の称号：" + type + "。架空構文7試合の結果です。 #MUKA1",
            ) +
            "&url=" +
            encodeURIComponent(location.origin + location.pathname)),
      );
      if (
        q.has("daily") &&
        winner < 256 &&
        ids.join(",") === daily().join(",")
      ) {
        const status = document.createElement("p");
        status.setAttribute("role", "status");
        game.append(status);
        const b = document.createElement("button");
        b.textContent = "今日の全国投票に参加";
        game.append(b);
        b.onclick = async () => {
          b.disabled = true;
          try {
            if (!API) throw Error("準備中");
            const client = voterClient();
            const res = await fetch(API + "/vote", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phrase: winner, client }),
            });
            if (!res.ok) throw Error("通信失敗");
            const d = await res.json();
            status.textContent = d.accepted
              ? "投票しました！"
              : "今日はすでに投票済みです。";
            const a = document.createElement("a");
            a.href = "ranking.html";
            a.textContent = "全国ランキングを見る";
            game.append(a);
          } catch {
            status.textContent = "投票できませんでした。再試行してください。";
            b.disabled = false;
          }
        };
      }
      let other = q.get("p");
      if (other) {
        let prior = parseIds(other, 7, phrases, false) || [];
        if (validVotes(prior, ids)) {
          let p = document.createElement("p");
          let same = choices
            .slice(0, 4)
            .filter((v, i) => v === prior[i]).length;
          p.textContent =
            "初戦の感性一致：" +
            same +
            "/4 ｜ 優勝構文：" +
            (winner === prior[6] ? "一致" : "不一致");
          game.append(p);
          const detail = document.createElement("details");
          const summary = document.createElement("summary");
          summary.textContent = "初戦4試合の判定を比較";
          detail.append(summary);
          for (let i = 0; i < 4; i++) {
            const item = document.createElement("p");
            item.textContent =
              "第" +
              (i + 1) +
              "試合 " +
              (choices[i] === prior[i]
                ? "一致：" + phrases.get(choices[i])
                : "不一致 ／ あなた：" +
                  phrases.get(choices[i]) +
                  " ／ 相手：" +
                  phrases.get(prior[i]));
            detail.append(item);
          }
          game.append(detail);
          for (let i = 0; i < 4; i++) {
            if (choices[i] === prior[i]) continue;
            button("第" + (i + 1) + "試合の第三者を募集", async () => {
              const link = new URL(location.href);
              link.search = "";
              link.searchParams.set("duel", "1");
              link.searchParams.set(
                "pair",
                ids.slice(i * 2, i * 2 + 2).join(","),
              );
              link.searchParams.set("pick", choices[i]);
              link.searchParams.set("jury", [prior[i], choices[i]].join(","));
              const msg = "意見が割れた二択。第三の審判を求む。 #MUKA1";
              if (navigator.share) {
                try {
                  await navigator.share({ text: msg, url: link.href });
                  return;
                } catch (e) {
                  if (e.name === "AbortError") return;
                }
              }
              location.href =
                "https://twitter.com/intent/tweet?text=" +
                encodeURIComponent(msg) +
                "&url=" +
                encodeURIComponent(link.href);
            });
          }
        }
      }
      let u = new URL(location.href);
      u.search = "";
      u.searchParams.set("cup", ids.join(","));
      if (custom && q.has("cup") && !q.has("daily"))
        u.searchParams.set("title", custom);
      if (q.has("daily")) u.searchParams.set("daily", "1");
      u.searchParams.set("p", choices.join(","));
      let msg =
        "俺が選んだ最悪の一文：" +
        phrases.get(winner) +
        " 俺だけがおかしいのか確認したい。 #MUKA1";
      if (other) {
        let prior = parseIds(other, 7, phrases, false) || [];
        if (validVotes(prior, ids)) {
          let same = choices
            .slice(0, 4)
            .filter((v, i) => v === prior[i]).length;
          msg =
            "初戦の感性一致率 " +
            same * 25 +
            "%。" +
            (same <= 2 ? "第三者の意見を求む。" : "お前も審判やってくれ。") +
            " #MUKA1";
        }
      }
      button("他人を巻き込む", async () => {
        if (navigator.share) {
          try {
            await navigator.share({ title: "MUKA-1", text: msg, url: u.href });
            return;
          } catch (e) {
            if (e.name === "AbortError") return;
          }
        }
        location.href =
          "https://twitter.com/intent/tweet?text=" +
          encodeURIComponent(msg) +
          "&url=" +
          encodeURIComponent(u.href);
      });
      button(
        "Xで審判を募集",
        () =>
          (location.href =
            "https://twitter.com/intent/tweet?text=" +
            encodeURIComponent(msg) +
            "&url=" +
            encodeURIComponent(u.href)),
      );
      button("ムカつき免許証を発行", () => {
        const cv = document.createElement("canvas");
        cv.width = 1000;
        cv.height = 630;
        const x = cv.getContext("2d");
        x.fillStyle = "#fff200";
        x.fillRect(0, 0, 1000, 630);
        x.strokeStyle = "#111";
        x.lineWidth = 12;
        x.strokeRect(20, 20, 960, 590);
        x.fillStyle = "#111";
        x.font = "bold 58px sans-serif";
        x.fillText("ムカつき免許証", 55, 110);
        x.font = "30px sans-serif";
        x.fillText("資格：架空構文審査員 ／ 7試合修了", 55, 180);
        x.font = "bold 40px sans-serif";
        let line = "",
          y = 270;
        for (const ch of phrases.get(winner)) {
          if (x.measureText(line + ch).width > 880) {
            x.fillText(line, 55, y);
            line = "";
            y += 58;
          }
          line += ch;
        }
        x.fillText(line, 55, y);
        x.font = "26px sans-serif";
        x.fillText("効力：特になし　　発行：MUKA-1", 55, 490);
        x.font = "21px sans-serif";
        x.fillText("pwgmjda00.github.io/kontonkyo/muka1-preview/", 55, 550);
        cv.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], "muka1-license.png", {
            type: "image/png",
          });
          try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                text: msg + " " + u.href,
              });
              return;
            }
          } catch (e) {
            if (e.name === "AbortError") return;
          }
          let link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = file.name;
          link.click();
          setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        }, "image/png");
      });
      button("地獄の号外を画像にする", () => {
        const cv = document.createElement("canvas");
        cv.width = 1200;
        cv.height = 630;
        const ctx = cv.getContext("2d");
        ctx.fillStyle = "#fff200";
        ctx.fillRect(0, 0, 1200, 630);
        ctx.fillStyle = "#111";
        ctx.fillRect(35, 35, 1130, 105);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 62px sans-serif";
        ctx.fillText("地獄の号外", 65, 110);
        ctx.fillStyle = "#111";
        ctx.font = "bold 32px sans-serif";
        ctx.fillText("MUKA-1 ／ 個人大会 優勝", 65, 200);
        ctx.font = "bold 52px sans-serif";
        let line = "",
          y = 285;
        for (const ch of phrases.get(winner)) {
          if (ctx.measureText(line + ch).width > 1060) {
            ctx.fillText(line, 65, y);
            y += 72;
            line = "";
          }
          line += ch;
        }
        ctx.fillText(line, 65, y);
        ctx.font = "bold 30px sans-serif";
        ctx.fillText("俺だけがおかしいのか？", 65, 535);
        ctx.font = "24px sans-serif";
        ctx.fillText(
          "架空の構文 ／ pwgmjda00.github.io/kontonkyo/muka1-preview/",
          65,
          585,
        );
        cv.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], "muka1.png", { type: "image/png" });
          try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                text: msg + " " + u.href,
              });
              return;
            }
          } catch (e) {
            if (e.name === "AbortError") return;
          }
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "muka1.png";
          link.click();
          setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        }, "image/png");
      });
      button("大会URLをコピー", async () => {
        try {
          await navigator.clipboard.writeText(u.href);
          alert("コピーしました");
        } catch {
          prompt("URLをコピー", u.href);
        }
      });
      button(
        "まだ腹が立つ",
        () => (location.href = location.pathname + "?random=1"),
      );
      button(
        "今日の全国共通お題",
        () => (location.href = location.pathname + "?daily=1"),
      );
      return;
    }
    round.textContent =
      ["準々決勝", "準決勝", "決勝"][stage] +
      " ／ " +
      (votes.length + 1) +
      "/7";
    let h = document.createElement("h2");
    h.textContent = "どっちがムカつく？";
    game.append(h);
    queue.slice(0, 2).forEach((id, i) => {
      if (i) {
        let vs = document.createElement("div");
        vs.className = "vs";
        vs.textContent = "VS";
        game.append(vs);
      }
      choiceButton((i ? "B選手：" : "A選手：") + phrases.get(id), id, () => {
        votes.push(i);
        choices.push(id);
        next.push(id);
        queue.splice(0, 2);
        if (!queue.length) {
          queue = next;
          next = [];
          stage++;
        }
        render();
      });
    });
  }
  document.querySelectorAll("nav a").forEach((a, i) => {
    if (
      i ===
      (q.has("gacha")
        ? 4
        : q.has("challenge")
          ? 5
          : q.has("host")
            ? 3
            : q.has("duel") || defaultDuel
              ? 0
              : q.has("daily")
                ? 1
                : 2)
    )
      a.setAttribute("aria-current", "page");
  });
  if (q.has("gacha")) {
    round.textContent = "ムカつきガチャ";
    function draw() {
      game.replaceChildren();
      const id = candidates[Math.floor(Math.random() * candidates.length)];
      const h = document.createElement("h2");
      h.textContent = phrases.get(id);
      game.append(h);
      button(
        "この一文をXに放流",
        () =>
          (location.href =
            "https://twitter.com/intent/tweet?text=" +
            encodeURIComponent(
              "今日引いた架空構文：" + phrases.get(id) + " #MUKA1",
            ) +
            "&url=" +
            encodeURIComponent(
              location.origin + location.pathname + "?gacha=1",
            )),
      );
      button("もう一枚引く", draw);
      button(
        "二択で遊ぶ",
        () => (location.href = location.pathname + "?duel=1"),
      );
    }
    draw();
  } else if (q.has("challenge")) {
    const pair = daily().slice(0, 2);
    const link = new URL(location.href);
    link.search = "";
    link.searchParams.set("duel", "1");
    link.searchParams.set("pair", pair.join(","));
    location.replace(link.href);
  } else if (q.has("host")) {
    game.replaceChildren();
    round.textContent = "地獄大会を主催";
    const chosen = new Set();
    const name = document.createElement("input");
    name.maxLength = 40;
    name.placeholder = "大会名（任意・個人名は入れない）";
    name.setAttribute("aria-label", "大会名");
    name.style.cssText = "width:100%;padding:12px;font:inherit";
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
    const theme = document.createElement("select");
    theme.setAttribute("aria-label", "大会テーマ");
    theme.style.cssText = "width:100%;padding:12px;font:inherit";
    theme.append(new Option("テーマを選ぶ（任意）", ""));
    themes.forEach(([name], i) => theme.append(new Option(name, String(i))));
    const auto = document.createElement("button");
    auto.textContent = "テーマから8構文を選ぶ";
    const info = document.createElement("p");
    const search = document.createElement("input");
    search.placeholder = "構文を検索";
    search.style.cssText = "width:100%;padding:12px;font:inherit";
    const list = document.createElement("div");
    list.style.cssText = "max-height:420px;overflow:auto";
    const launch = document.createElement("button");
    launch.className = "primary";
    launch.textContent = "大会を開催";
    const refresh = () => {
      info.textContent = "選出 " + chosen.size + "/8";
      launch.disabled = chosen.size !== 8;
      list.replaceChildren();
      for (const id of candidates.filter((id) =>
        phrases.get(id).includes(search.value),
      )) {
        const label = document.createElement("label");
        label.style.cssText =
          "display:flex;gap:8px;background:white;border:1px solid;padding:12px;margin:4px 0";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = chosen.has(id);
        cb.disabled = chosen.size === 8 && !cb.checked;
        cb.onchange = () => {
          if (cb.checked && chosen.size < 8) chosen.add(id);
          else chosen.delete(id);
          refresh();
        };
        label.append(cb, document.createTextNode(phrases.get(id)));
        list.append(label);
      }
    };
    auto.onclick = () => {
      if (theme.value === "") {
        info.textContent = "テーマを選んでください";
        return;
      }
      const matches = candidates.filter((id) =>
        themes[Number(theme.value)][1].test(phrases.get(id)),
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
    };
    search.oninput = refresh;
    launch.onclick = () => {
      if (chosen.size === 8) {
        const u = new URL(location.href);
        u.search = "";
        u.searchParams.set("cup", Array.from(chosen).join(","));
        const title = name.value.trim();
        if (title) u.searchParams.set("title", title);
        location.href = u.href;
      }
    };
    const poster = document.createElement("button");
    poster.textContent = "大会告知画像を作る";
    poster.onclick = () => {
      if (chosen.size !== 8) {
        info.textContent = "8構文を選んでください";
        return;
      }
      const u = new URL(location.href);
      u.search = "";
      u.searchParams.set("cup", [...chosen].join(","));
      const title = name.value.trim() || "ムカつくツイートグランプリ";
      u.searchParams.set("title", title);
      const cv = document.createElement("canvas");
      cv.width = 1200;
      cv.height = 1500;
      const x = cv.getContext("2d");
      x.fillStyle = "#fff200";
      x.fillRect(0, 0, 1200, 1500);
      x.fillStyle = "#111";
      x.fillRect(0, 0, 1200, 95);
      x.fillStyle = "#fff200";
      x.font = "bold 42px sans-serif";
      x.fillText("MUKA-1 / 開催告知", 45, 63);
      x.fillStyle = "#111";
      function wrap(s, px, y, w, size, max) {
        x.font = "bold " + size + "px sans-serif";
        let line = "",
          n = 0;
        for (const ch of s) {
          if (x.measureText(line + ch).width > w) {
            x.fillText(line, px, y + n * (size + 8));
            n++;
            line = "";
            if (n >= max) return;
          }
          line += ch;
        }
        if (line && n < max) x.fillText(line, px, y + n * (size + 8));
      }
      wrap(title, 45, 170, 1110, 56, 2);
      [...chosen].forEach((id, i) => {
        const y = 300 + i * 125;
        x.fillStyle = "#fff";
        x.fillRect(40, y, 1120, 112);
        x.strokeStyle = "#111";
        x.lineWidth = 3;
        x.strokeRect(40, y, 1120, 112);
        x.fillStyle = "#111";
        x.font = "bold 32px sans-serif";
        x.fillText(String(i + 1).padStart(2, "0"), 58, y + 45);
        wrap(phrases.get(id), 135, y + 42, 990, 30, 2);
      });
      x.fillStyle = "#111";
      x.font = "bold 38px sans-serif";
      x.fillText("8構文 / 7試合 / 賞金0円", 45, 1370);
      x.font = "28px sans-serif";
      x.fillText("架空構文の大会です。 #MUKA1", 45, 1430);
      cv.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "muka1-poster.png", {
          type: "image/png",
        });
        const msg = title + " 開催。審判求む。 #MUKA1 " + u.href;
        try {
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], text: msg });
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
        try {
          await navigator.clipboard.writeText(msg);
          info.textContent = "画像を保存し、招待文をコピーしました";
        } catch {
          prompt("招待文をコピー", msg);
        }
      }, "image/png");
    };
    game.append(theme, auto, name, info, search, list, poster, launch);
    refresh();
  } else if (q.has("duel") || defaultDuel) duel();
  else render();
})();
