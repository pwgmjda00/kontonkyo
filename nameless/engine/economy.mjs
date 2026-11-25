export const resources=['hp','food','material','gold','knowledge','mana','will','abyss','soul','causality','time','truth'];
export const speed=lv=>1+Math.log2(lv)*.25;
export const abyssEfficiency=(abyss,otherworld=false)=>otherworld?1+2*abyss/100:1-.7*abyss/100;
export function transact(state,cost={},gain={}){
 const next={...state.resources};
 for(const [k,v] of Object.entries(cost)){if(!resources.includes(k)||!Number.isFinite(v)||v<0)throw Error('invalid cost');if(next[k]<v)return false;next[k]-=v;}
 for(const [k,v] of Object.entries(gain)){if(!resources.includes(k)||!Number.isFinite(v)||v<0)throw Error('invalid gain');next[k]=Math.min(state.caps[k],next[k]+v);}
 state.resources=next;return true;
}
