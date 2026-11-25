import { PHRASE_MAP, submissionPhraseId } from './catalog.js';

export const phrases = new Map(PHRASE_MAP);
const API = window.MUKA_API || '';
export async function api(path, options = {}) {
  if (!API) throw new Error('全国集計の接続先が未設定です。');
  const response = await fetch(API + path, { ...options, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('全国集計を取得できません。時間をおいて再読み込みしてください。');
  return response.json();
}
export async function approved() {
  let after = null;
  const seen = new Set();
  do {
    const data = await api('/approved' + (after === null ? '' : '?after=' + after));
    for (const item of data.items || []) {
      const id = submissionPhraseId(item.id);
      if (id !== null && typeof item.text === 'string' && !PHRASE_MAP.has(id)) phrases.set(id, item.text);
    }
    const cursor = data.nextCursor;
    if (!Number.isInteger(cursor) || cursor <= (after || 0) || seen.has(cursor)) break;
    seen.add(cursor);
    after = cursor;
  } while (true);
}
export function phrase(id) {
  return phrases.get(id) || '構文 ID ' + id + '（本文を取得できませんでした）';
}
export function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function validCount(row) {
  return row && Number.isSafeInteger(row.phrase) && row.phrase >= 0 && Number.isSafeInteger(row.votes) && row.votes >= 0;
}
export const kindName = kind => ({ day: '日間', week: '週間', month: '月間', year: '年間' })[kind] || kind;
