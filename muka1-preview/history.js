import { api, approved, phrase, el, validCount, kindName } from './pages.js';

const status = document.querySelector('#status');
let weekCursor = null, festivalCursor = null;
const seenWeeks = new Set(), seenFestivals = new Set();
function frame(parent, row, label) {
  if (!validCount(row)) return null;
  const article = el('article');
  article.append(el('small', label + ' ／ ' + row.votes + '票'), el('strong', phrase(row.phrase)));
  parent.append(article);
  return article;
}
function wrapped(ctx, text, size, width) {
  ctx.font = 'bold ' + size + 'px sans-serif';
  const lines = [];
  let line = '';
  for (const char of text) {
    if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = ''; }
    line += char;
  }
  if (line) lines.push(line);
  return lines;
}
async function share(row, day, button) {
  button.disabled = true;
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 900;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff200'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111'; ctx.font = 'bold 65px sans-serif'; ctx.fillText('全国号外 ／ MUKA-1', 55, 100);
    ctx.font = '30px sans-serif'; ctx.fillText(day + ' ／ ' + row.votes + '票', 55, 170);
    let size = 48, lines = wrapped(ctx, phrase(row.phrase), size, 1090);
    while (lines.length * (size + 12) > 540 && size > 20) lines = wrapped(ctx, phrase(row.phrase), --size, 1090);
    lines.forEach((line, i) => ctx.fillText(line, 55, 250 + i * (size + 12)));
    ctx.font = '25px sans-serif'; ctx.fillText('架空構文の全国投票 #MUKA1', 55, 850);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw Error('画像を作成できませんでした。');
    const file = new File([blob], 'muka1-news.png', { type: 'image/png' });
    const text = day + ' の最悪が決まりました。' + row.votes + '票。 #MUKA1';
    const url = new URL('history.html', location.href).href;
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text, url }); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    const link = el('a');
    link.href = URL.createObjectURL(blob); link.download = file.name; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
}
async function loadWeeks(first = false) {
  const button = document.querySelector('#older-weeks');
  const message = document.querySelector('#week-status');
  button.disabled = true;
  try {
    const data = await api('/history' + (weekCursor ? '?before=' + encodeURIComponent(weekCursor) : ''));
    if (!Array.isArray(data.weeks) || !Array.isArray(data.winners)) throw Error('履歴データを確認できません。');
    if (first) {
      status.textContent = data.day + ' の確定結果' + (data.winners.length ? '' : ' ／ 投票なし・王者なし');
      for (const row of data.winners) {
        const article = frame(document.querySelector('#daily'), row, data.winners.length > 1 ? '共同優勝' : '優勝');
        if (article) {
          const image = el('button', '号外を画像にする');
          image.onclick = () => share(row, data.day, image);
          article.append(image);
        }
      }
    }
    for (const row of data.weeks) {
      const key = row.week + ':' + row.phrase;
      if (!seenWeeks.has(key)) { seenWeeks.add(key); frame(document.querySelector('#weeks'), row, row.week + ' 週の王者'); }
    }
    if (data.nextCursor && data.nextCursor === weekCursor) throw Error('続きの履歴を取得できませんでした。');
    weekCursor = typeof data.nextCursor === 'string' ? data.nextCursor : null;
    button.hidden = !weekCursor;
    message.textContent = seenWeeks.size ? (weekCursor ? '' : '保存されている週間王者をすべて表示しました。') : 'まだ確定した週間王者はありません。';
  } catch (error) { if (first) status.textContent = error.message; message.textContent = error.message; }
  finally { button.disabled = false; }
}
async function loadFestivals() {
  const button = document.querySelector('#older-festivals');
  const message = document.querySelector('#festival-status');
  button.disabled = true;
  try {
    const data = await api('/festival' + (festivalCursor ? '?cursor=' + encodeURIComponent(festivalCursor) : ''));
    if (!Array.isArray(data.archives)) throw Error('決戦の履歴を確認できません。');
    for (const festival of data.archives) {
      if (seenFestivals.has(festival.id)) continue;
      seenFestivals.add(festival.id);
      const section = el('section');
      section.append(el('h4', festival.period + ' ' + kindName(festival.kind) + '決戦'));
      if (festival.status === 'insufficient') section.append(el('p', '候補不足のため不成立'));
      else if (!festival.winners?.length) section.append(el('p', '投票なし・王者なし'));
      else {
        for (const id of festival.winners) {
          const row = festival.counts?.find(x => x.phrase === id);
          if (row) frame(section, row, festival.winners.length > 1 ? '共同王者' : '王者');
        }
      }
      document.querySelector('#festivals').append(section);
    }
    if (data.nextCursor && data.nextCursor === festivalCursor) throw Error('続きの決戦履歴を取得できませんでした。');
    festivalCursor = typeof data.nextCursor === 'string' ? data.nextCursor : null;
    button.hidden = !festivalCursor;
    message.textContent = seenFestivals.size ? (festivalCursor ? '' : '保存されている決戦をすべて表示しました。') : 'まだ確定した月間・年間決戦はありません。';
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
}
document.querySelector('#older-weeks').onclick = () => loadWeeks();
document.querySelector('#older-festivals').onclick = loadFestivals;
(async () => {
  const catalogLoaded = await approved().then(() => true, () => false);
  await Promise.all([loadWeeks(true), loadFestivals()]);
  if (!catalogLoaded) status.append(el('small', '承認投稿の本文は一部取得できませんでした。'));
})();
