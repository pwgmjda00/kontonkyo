// Four Kingdoms: DOM-independent rules, compatible with the M10 board format.
export function canPlaceKingdom(realms,card,suit,player){
  if(!card||!Number.isInteger(suit)||suit<0||suit>3||![0,1].includes(player))return false;
  const realm=realms[suit];if(!Array.isArray(realm))return false;
  if(!realm.length)return card.si===suit;
  return realm.some(x=>x.owner===player&&Math.abs(x.c.r-card.r)===1&&card.si===suit)
    ||realm.some(x=>x.owner!==player&&x.c.r===card.r&&x.c.si!==card.si);
}
export function placeKingdom(realms,card,suit,player){
  if(!canPlaceKingdom(realms,card,suit,player))return null;
  const next=realms.map(r=>r.map(x=>({...x})));
  const realm=next[suit];const target=realm.findIndex(x=>x.owner!==player&&x.c.r===card.r&&x.c.si!==card.si);
  if(target>=0)realm.splice(target,1);
  realm.push({c:card,owner:player});return next;
}
export function kingdomOptions(realms,hand,player){
  const out=[];hand.forEach((c,j)=>realms.forEach((_,si)=>{if(canPlaceKingdom(realms,c,si,player))out.push({j,si})}));return out;
}
export function kingdomScores(realms){
  const points=[0,0];realms.forEach(r=>{
    const counts=[0,0];r.forEach(x=>{points[x.owner]+=2;counts[x.owner]++});
    if(counts[0]!==counts[1]&&r.length)points[counts[0]>counts[1]?0:1]+=10;
    for(let p=0;p<2;p++){
      const vals=new Set(r.filter(x=>x.owner===p).map(x=>x.c.r));
      if([...vals].some(v=>vals.has(v+1)&&vals.has(v+2)))points[p]+=5;
    }
  });
  for(let p=0;p<2;p++)if(realms.every(r=>r.some(x=>x.owner===p)))points[p]+=10;
  return points;
}