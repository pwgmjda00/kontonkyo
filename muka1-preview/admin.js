const $ = id => document.getElementById(id);
const API = window.MUKA_API || '';
$('api').value = API;
const labels = { visit: '訪問イベント', duel_start: '決闘開始', duel_complete: '決闘完了', cup_start: '大会開始', cup_complete: '大会完走', host_create: '主催大会作成', share_attempt: '共有操作', invite_visit: '招待経由訪問', invite_complete: '招待経由完了', daily_vote_accepted: '全国投票受理', submission_accepted: '匿名投稿受理' };
const sources = { x: 'X', social: 'その他SNS', invite: '招待', direct: '直接', unknown: '不明' };
const modes = { duel: '二択', daily: '日替わり大会', cup: '大会', random: 'ランダム大会', host: '主催者', gacha: 'ガチャ', festival: '特別決戦', unknown: '不明' };
function el(tag, text) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; }
async function call(path, method = 'GET', body) {
  const url = new URL(API);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.workers.dev')) throw Error('接続先の設定を確認してください。');
  if (!$('token').value) throw Error('管理者キーを入力してください。');
  const response = await fetch(url.origin + path, { method, headers: { Authorization: 'Bearer ' + $('token').value, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error(response.status === 401 ? '管理者キーを確認してください。' : '通信エラー ' + response.status);
  return response.json();
}
let generation = 0;
function forget() {
  generation++;
  $('token').value = '';
  $('list').replaceChildren(); $('analytics').replaceChildren();
  $('msg').textContent = 'キーと取得データを消しました。'; $('analytics-status').textContent = '';
}
$('forget').onclick = forget;
window.addEventListener('pagehide', forget);
async function load() {
  const current = generation;
  $('load').disabled = true;
  try {
    const data = await call('/admin/submissions');
    if (current !== generation) return;
    if (!Array.isArray(data.items)) throw Error('審査データを確認できません。');
    $('list').replaceChildren();
    $('msg').textContent = data.items.length + '件（最大100件表示）';
    for (const item of data.items) {
      const article = el('article'), text = el('textarea');
      text.value = item.text; text.maxLength = 140; text.setAttribute('aria-label', '投稿 ' + item.id + ' の本文');
      article.append(text);
      for (const [label, status] of [['修正して承認', 'approved'], ['却下', 'rejected']]) {
        const button = el('button', label);
        button.onclick = async () => {
          if (!confirm(label + 'しますか？')) return;
          const buttons = [...article.querySelectorAll('button')]; buttons.forEach(x => { x.disabled = true; });
          try {
            const result = await call('/admin/submissions', 'POST', { id: item.id, text: text.value, status });
            if (current !== generation) return;
            if (!result.updated) throw Error('更新されませんでした。再取得して状態を確認してください。');
            article.remove(); $('msg').textContent = '処理しました。';
          } catch (error) { $('msg').textContent = error.message; buttons.forEach(x => { x.disabled = false; }); }
        };
        article.append(button);
      }
      $('list').append(article);
    }
  } catch (error) { if (current === generation) $('msg').textContent = error.message; }
  finally { $('load').disabled = false; }
}
function table(parent, headings, rows) {
  const wrapper = el('div'); wrapper.className = 'scroll';
  const t = el('table'), head = el('thead'), header = el('tr'), body = el('tbody');
  headings.forEach(x => header.append(el('th', x))); head.append(header);
  for (const row of rows) { const tr = el('tr'); row.forEach(x => tr.append(el('td', String(x)))); body.append(tr); }
  t.append(head, body); wrapper.append(t); parent.append(wrapper);
}
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : '未取得';
const percent = value => typeof value === 'number' && Number.isFinite(value) ? (value * 100).toFixed(1) + '%' : '未算出（分母0）';
async function analytics() {
  const current = generation;
  $('load-analytics').disabled = true;
  try {
    const data = await call('/admin/analytics?days=' + $('days').value);
    if (current !== generation) return;
    const parent = $('analytics'); parent.replaceChildren();
    $('analytics-status').textContent = data.from + '〜' + data.through + (data.enabled === false ? ' ／ 解析受付は停止中' : '');
    parent.append(el('p', '訪問数はユニーク人数ではありません。共有操作は実際の投稿成功とは別です。以下の率はイベント単位の代理指標です。'));
    parent.append(el('h2', 'イベント集計'));
    table(parent, ['イベント', '件数'], Object.entries(labels).map(([key, label]) => [label, count(data.totals?.[key])]));
    parent.append(el('h2', '完了と共有'));
    const metrics = el('dl');
    for (const [label, value] of [
      ['決闘完了率（完了／開始）', percent(data.rates?.duelCompletion)],
      ['大会完走率（完走／開始）', percent(data.rates?.cupCompletion)],
      ['共有操作／全完了', percent(data.rates?.shareOperationsPerCompletion)],
      ['招待由来完了／全完了（K係数の代理指標）', percent(data.rates?.inviteCompletionProxy)],
      ['招待IDあたり完了イベント', typeof data.rates?.completionsPerInvite === 'number' ? data.rates.completionsPerInvite.toFixed(2) : '未算出（分母0）'],
    ]) metrics.append(el('dt', label), el('dd', value));
    parent.append(metrics, el('h2', '日別'));
    table(parent, ['日付', '訪問', '完了', '共有操作'], (data.daily || []).map(x => [x.day, count(x.visits), count(x.completions), count(x.shares)]));
    for (const [heading, groups, names] of [['流入別', data.bySource, sources], ['モード別', data.byMode, modes]]) {
      parent.append(el('h2', heading));
      const rows = Object.entries(groups || {}).map(([key, values]) => [names[key] || key, count(values.visit || 0), (values.duel_complete || 0) + (values.cup_complete || 0), count(values.share_attempt || 0)]);
      table(parent, ['分類', '訪問', '完了', '共有操作'], rows);
    }
    parent.append(el('h2', '招待ID別'));
    table(parent, ['招待ID', '訪問', '完了'], (data.inviteCompletions || []).map(x => [x.invite, count(x.visits), count(x.completions)]));
    parent.append(el('p', '同じ人による複数操作を含むため、厳密なK係数や実人数は計算できません。'));
    if (data.retention) parent.append(el('small', '保持期間：生イベント' + data.retention.rawDays + '日、日別匿名集計' + data.retention.aggregateDays + '日。'));
  } catch (error) { if (current === generation) $('analytics-status').textContent = error.message; }
  finally { $('load-analytics').disabled = false; }
}
$('load').onclick = load;
$('load-analytics').onclick = analytics;
