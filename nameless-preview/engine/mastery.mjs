// Provisional curve: cumulative completions, level 5 after 8 uses.
export const threshold=lv=>2*(lv-1)+(lv>5?(lv-5)**2:0);
export function award(s,id){s.xp??={};s.xp[id]=(s.xp[id]??0)+1;let lv=s.levels[id]??1;while(lv<100&&s.xp[id]>=threshold(lv+1))lv++;s.levels[id]=lv;}
export function effectiveCost(s,id,cost={}){return Object.fromEntries(Object.entries(cost).map(([k,v])=>[k,(s.levels[id]??1)>=10?v*.9:v]));}
