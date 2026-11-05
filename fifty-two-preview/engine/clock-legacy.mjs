/** Faithful pure-state version of the 13時 rules currently embedded in www/index.html.
 * This is deliberately separate from the earlier 52-slot reference implementation.
 */
export function clockMoves(state){
  if(state.status!=='playing')return [];
  const slots=state.slots,outer=slots.length-1,moves=[];
  for(let i=0;i<slots.length;i++){
    if(!slots[i])continue;
    if((slots[i].r??slots[i].rank)===13)moves.push([i]);
    for(let j=i+1;j<slots.length;j++){
      if(!slots[j]||(slots[i].r??slots[i].rank)+(slots[j].r??slots[j].rank)!==13)continue;
      if(i===outer||j===outer||Math.abs(i-j)===1||Math.abs(i-j)===outer-1)moves.push([i,j]);
    }
  }
  return moves;
}
export function clockStart(cards,{mode='slow'}={}){
  if(!['slow','fast'].includes(mode))throw Error('invalid mode');
  const size=mode==='fast'?9:13;
  const required=mode==='fast'?26:52;
  if(!Array.isArray(cards)||cards.length!==required)throw Error('wrong deck size');
  const ids=cards.map(c=>c.id);
  if(new Set(ids).size!==ids.length||cards.some(c=>!Number.isInteger(c.r??c.rank)||(c.r??c.rank)<1||(c.r??c.rank)>13))throw Error('invalid cards');
  const state={slots:cards.slice(0,size),stock:cards.slice(size),removed:0,status:'playing',mode};
  return {...state,status:clockMoves(state).length?'playing':'stuck'};
}
export function clockPlay(state,indices){
  if(state.status!=='playing')throw Error('game ended');
  if(!Array.isArray(indices)||!clockMoves(state).some(m=>m.length===indices.length&&m.every((v,i)=>v===indices[i])))throw Error('illegal move');
  const slots=[...state.slots],stock=[...state.stock];
  for(const i of indices)slots[i]=null;
  const outer=slots.length-1;
  const ring=slots.slice(0,outer);
  ring.unshift(ring.pop());
  const rotated=[...ring,slots[outer]];
  [rotated[0],rotated[outer]]=[rotated[outer],rotated[0]];
  for(let i=0;i<rotated.length;i++)if(!rotated[i]&&stock.length)rotated[i]=stock.pop();
  const next={slots:rotated,stock,removed:state.removed+indices.length,status:'playing',mode:state.mode};
  return {...next,status:next.removed===(state.mode==='fast'?26:52)?'won':clockMoves(next).length?'playing':'stuck'};
}