/** OBLIVION legacy-compatible deterministic transition. UI owns delayed reveal and timers. */
export function memoryResolve(state, a, b, rng=Math.random){
  const cards=state.cards;
  if(!Array.isArray(cards)||!Number.isInteger(a)||!Number.isInteger(b)||a===b||a<0||b<0||a>=cards.length||b>=cards.length||!cards[a]||!cards[b])throw new Error('invalid memory pair');
  const result={...state,cards:[...cards],open:[],msg:state.msg||''};
  const x=cards[a],y=cards[b];
  const match=x.r===y.r||(x.si===y.si&&Math.abs(x.r-y.r)===1);
  if(match){
    result.score+=x.r===y.r?10:15;
    result.score+=state.streak*5;
    result.streak++;
    result.cards[a]=result.cards[b]=null;
    result.exchanges++;
    if(state.mode==='slow'||result.exchanges%2===0){
      const remaining=result.cards.map((c,i)=>c?i:-1).filter(i=>i>=0);
      if(remaining.length>=2){
        const pick=(length)=>{const value=rng();if(!Number.isFinite(value)||value<0||value>=1)throw new RangeError('rng must return [0,1)');return Math.floor(value*length)};
        const first=remaining.splice(pick(remaining.length),1)[0],second=remaining[pick(remaining.length)];
        [result.cards[first],result.cards[second]]=[result.cards[second],result.cards[first]];
        result.msg='位置 '+(first+1)+' と '+(second+1)+' が交換された';
      }
    }
    if(result.cards.every(c=>c===null)){result.done=true;result.msg='全消去成功！'}
  }else{
    result.fail++;result.streak=0;result.msg='不一致';
    if(state.mode==='fast'&&result.fail>=5){result.done=true;result.msg='失敗回数上限'}
  }
  return {state:result,match};
}