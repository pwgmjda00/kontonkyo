import { createQRCode } from "./vendor/qrcode.js";

const FONT =
  'system-ui, -apple-system, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';

// Wrap by code point. The caller sizes the card from the resulting line count:
// no phrase is silently truncated, including a 140-character approved entry.
export function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const character of String(text)) {
    if (character === "\n") {
      lines.push(line);
      line = "";
    } else if (line && ctx.measureText(line + character).width > maxWidth) {
      lines.push(line);
      line = character;
    } else line += character;
  }
  if (line || !lines.length) lines.push(line);
  return lines;
}

function drawLines(ctx, lines, x, y, lineHeight) {
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
}

function bracket(ctx, top) {
  ctx.fillStyle = "#111";
  ctx.font = `800 37px ${FONT}`;
  ctx.fillText("8構文 → 7試合 → 最悪の一文", 50, top + 45);
  ctx.font = `700 25px ${FONT}`;
  ["準々決勝", "準決勝", "決勝", "優勝"].forEach((label, i) => {
    ctx.fillText(label, [64, 390, 720, 1000][i], top + 91);
  });
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#111";
  const centers = Array.from({ length: 8 }, (_, i) => top + 126 + i * 38);
  const columns = [200, 500, 800, 1040];
  centers.forEach((y, i) => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(60, y - 15, 100, 30);
    ctx.fillStyle = "#111";
    ctx.font = `800 23px ${FONT}`;
    ctx.fillText(String(i + 1).padStart(2, "0"), 91, y + 8);
  });
  let ys = centers;
  columns.slice(0, 3).forEach((x, round) => {
    const next = [];
    for (let i = 0; i < ys.length; i += 2) {
      const mid = (ys[i] + ys[i + 1]) / 2;
      const fromX = round === 0 ? 160 : columns[round - 1] + 25;
      ctx.beginPath();
      ctx.moveTo(fromX, ys[i]);
      ctx.lineTo(x, ys[i]);
      ctx.lineTo(x, ys[i + 1]);
      ctx.lineTo(fromX, ys[i + 1]);
      ctx.moveTo(x, mid);
      ctx.lineTo(x + 25, mid);
      ctx.stroke();
      next.push(mid);
    }
    ys = next;
  });
  ctx.beginPath();
  ctx.moveTo(825, ys[0]);
  ctx.lineTo(1040, ys[0]);
  ctx.stroke();
  ctx.fillStyle = "#111";
  ctx.fillRect(1030, ys[0] - 40, 115, 80);
  ctx.fillStyle = "#fff200";
  ctx.font = `900 48px ${FONT}`;
  ctx.fillText("？", 1062, ys[0] + 18);
}

export async function createPoster({ title, ids, phrases, url }) {
  if (
    !Array.isArray(ids) ||
    ids.length !== 8 ||
    new Set(ids).size !== 8 ||
    !ids.every((id) => typeof phrases.get(id) === "string")
  ) {
    throw new Error("8構文を選んでください");
  }
  const inviteURL = new URL(url);
  if (!["https:", "http:"].includes(inviteURL.protocol))
    throw new Error("招待URLが不正です");
  const qr = createQRCode(inviteURL.href, { errorCorrectionLevel: "M" });
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像を作成できません");
  ctx.font = `900 60px ${FONT}`;
  const titleLines = wrapLines(
    ctx,
    (title || "ムカつくツイートグランプリ").trim().slice(0, 40),
    1100,
  );
  ctx.font = `750 40px ${FONT}`;
  const entries = ids.map((id) => {
    const lines = wrapLines(ctx, phrases.get(id), 955);
    return { lines, height: Math.max(128, lines.length * 49 + 34) };
  });
  const entriesTop = 172 + titleLines.length * 74;
  const bracketTop =
    entriesTop +
    entries.reduce((height, entry) => height + entry.height + 15, 0) +
    14;
  const qrTop = bracketTop + 455;
  canvas.height = qrTop + 590;
  // Setting canvas.height resets drawing state.
  ctx.fillStyle = "#fff200";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, 1200, 96);
  ctx.fillStyle = "#fff200";
  ctx.font = `900 43px ${FONT}`;
  ctx.fillText("MUKA-1 ／ 大会開催のお知らせ", 50, 66);
  ctx.fillStyle = "#111";
  ctx.font = `900 60px ${FONT}`;
  drawLines(ctx, titleLines, 50, 175, 74);
  let y = entriesTop;
  entries.forEach((entry, index) => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(45, y, 1110, entry.height);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 4;
    ctx.strokeRect(45, y, 1110, entry.height);
    ctx.fillStyle = "#111";
    ctx.font = `900 34px ${FONT}`;
    ctx.fillText(String(index + 1).padStart(2, "0"), 66, y + 53);
    ctx.font = `750 40px ${FONT}`;
    drawLines(ctx, entry.lines, 175, y + 50, 49);
    y += entry.height + 15;
  });
  bracket(ctx, bracketTop);
  ctx.fillStyle = "#111";
  ctx.fillRect(45, qrTop - 12, 1110, 5);
  // An integer number of pixels per module keeps QR edges sharp in the PNG.
  const quietZone = 4;
  const cell = Math.max(1, Math.floor(470 / (qr.modules.size + quietZone * 2)));
  const side = (qr.modules.size + quietZone * 2) * cell;
  const qrX = 50;
  const qrY = qrTop + 30;
  ctx.fillStyle = "#fff";
  ctx.fillRect(qrX, qrY, side, side);
  ctx.fillStyle = "#000";
  for (let row = 0; row < qr.modules.size; row++) {
    for (let col = 0; col < qr.modules.size; col++) {
      if (qr.modules.get(row, col)) {
        ctx.fillRect(
          qrX + (col + quietZone) * cell,
          qrY + (row + quietZone) * cell,
          cell,
          cell,
        );
      }
    }
  }
  ctx.fillStyle = "#111";
  ctx.font = `900 48px ${FONT}`;
  drawLines(ctx, ["審判、募集中。", "賞金は0円。"], 555, qrTop + 115, 70);
  ctx.font = `750 32px ${FONT}`;
  drawLines(
    ctx,
    ["QRからこの大会に参加", "8構文を7回ジャッジ", "リンクをDM・LINEで送ろう"],
    555,
    qrTop + 300,
    49,
  );
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText(
    "すべて架空の構文です。実在の人物への攻撃は禁止。",
    50,
    canvas.height - 75,
  );
  ctx.fillText(
    "pwgmjda00.github.io/kontonkyo/muka1-preview/   #MUKA1",
    50,
    canvas.height - 28,
  );
  return canvas;
}
