import { dailyIds, validDay } from './catalog.js';
import { api, approved, phrase, el, validCount } from './pages.js';

const status = document.querySelector('#status');
const weekly = new URLSearchParams(location.search).get('period') === 'week';
(async () => {
  try {
    const [data, catalogResult] = await Promise.all([api('/ranking' + (weekly ? '?period=week' : '')), approved().then(() => true, () => false)]);
    if (!validDay(data.day) || !Array.isArray(data.ranking) || !data.ranking.every(validCount)) throw Error('集計データを確認できません。');
    if (weekly && data.period !== 'week') throw Error('週間集計を確認できません。');
    if (!weekly) {
      const ids = dailyIds(data.day);
      if (data.ranking.length !== 8 || data.ranking.some(x => !ids.includes(x.phrase)) || new Set(data.ranking.map(x => x.phrase)).size !== 8) throw Error('大会候補と集計の対応を確認できません。');
    }
    const rows = [...data.ranking].sort((a, b) => b.votes - a.votes || a.phrase - b.phrase).slice(0, weekly ? 20 : 8);
    status.textContent = (weekly ? data.from + '〜' : '') + data.day + ' ／ ' + (rows.some(x => x.votes > 0) ? (weekly ? '週間 TOP20（開催中）' : '日替わり大会 TOP8（開催中）') : 'まだ投票がありません');
    if (!catalogResult) status.append(el('small', ' 承認投稿の本文は一部取得できませんでした。'));
    let rank = 0, last = null;
    rows.forEach((row, i) => {
      if (row.votes !== last) { rank = i + 1; last = row.votes; }
      const item = el('li');
      const label = el('span', row.votes > 0 ? (['', '🥇 第1位', '🥈 第2位', '🥉 第3位'][rank] || '第' + rank + '位') : '未得票', 'rank');
      if (row.votes > 0 && rank <= 3) item.className = 'framed ' + ['', 'gold', 'silver', 'bronze'][rank];
      item.append(label, el('div', phrase(row.phrase)), el('span', row.votes + '票', 'votes'));
      document.querySelector('#list').append(item);
    });
  } catch (error) { status.textContent = error.message; }
})();
