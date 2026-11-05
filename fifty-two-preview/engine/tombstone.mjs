// Tombstone legacy rules, pure and DOM-independent.
export const isRed = c => c.si === 1 || c.si === 2;
export function selectedCards(state, sel) {
  if (!sel) return [];
  if (sel.type === 'waste') return state.waste.length ? [state.waste.at(-1)] : [];
  if (sel.type === 'hold') return state.hold ? [state.hold] : [];
  if (sel.type === 'col') {
    const col = state.cols[sel.ci];
    return col && Number.isInteger(sel.j) && sel.j >= 0 && col[sel.j]?.up && col.slice(sel.j).every(x=>x.up) ? col.slice(sel.j).map(x=>x.c) : [];
  }
  return [];
}
export function canFoundation(state, sel, suit) {
  const cards = selectedCards(state, sel);
  if (cards.length !== 1 || !Number.isInteger(suit) || suit < 0 || suit > 3) return false;
  const c=cards[0];
  return c.si===suit && c.r===(state.mode==='fast'?6:1)+state.found[suit].length;
}
export function canMoveColumn(state, sel, targetIndex) {
  if (!Number.isInteger(targetIndex) || targetIndex<0 || targetIndex>=state.cols.length) return false;
  if (sel?.type==='col' && sel.ci===targetIndex) return false;
  const cards=selectedCards(state,sel);
  if (!cards.length || !cards.every((c,i)=>i===0 || cards[i-1].r===c.r+1 && isRed(cards[i-1])!==isRed(c))) return false;
  const target=state.cols[targetIndex].at(-1)?.c;
  return target ? target.r===cards[0].r+1 && isRed(target)!==isRed(cards[0]) : cards[0].r===13;
}
export function canRecycle(state) {return !state.stock.length && !!state.waste.length && (state.mode==='fast'||state.passes<2)}
export function completedSuits(state) {return state.found.filter(x=>x.length===(state.mode==='fast'?8:13)).length}
export function tombstoneWon(state) {return completedSuits(state)>=(state.mode==='fast'?2:4)}