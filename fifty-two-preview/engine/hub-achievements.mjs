// Shared, DOM-independent proof reader for the five games embedded in index.html.
import {validMeld} from './accomplice.mjs';
import {tombstoneWon} from './tombstone.mjs';
import {kingdomScores,kingdomOptions} from './kingdoms.mjs';
const suits=['♠','♥','♦','♣'];
const ids=['tombstone','accomplice','thirteenth-hour','four-kingdoms','oblivion'];
export function validHubSave(g){
 if(!g||typeof g!== 'object'||Array.isArray(g)||!Number.isInteger(g.i)||g.i<0||g.i>4||!['slow','fast'].includes(g.mode)||!Number.isSafeInteger(g.turn)||g.turn<0||typeof g.done!=='boolean'||typeof g.msg!=='string')return false;
 const arr=(v,n)=>Array.isArray(v)&&v.length===n;
 const cardOK=c=>c&&typeof c==='object'&&Number.isInteger(c.si)&&c.si>=0&&c.si<4&&Number.isInteger(c.r)&&c.r>=1&&c.r<=13&&c.id===c.si*13+c.r&&c.s===suits[c.si];
 const cards=v=>Array.isArray(v)&&v.every(cardOK);
 const hands=v=>arr(v,2)&&v.every(cards);
 const uniqueZones=(zones)=>{const ids=zones.flat().filter(Boolean).map(c=>c.id);return ids.length===new Set(ids).size;};
 const pile=v=>Array.isArray(v)&&v.every(x=>x&&cardOK(x.c)&&typeof x.up==='boolean');
 const expected=g.mode==='fast'?[32,52,26,36,16][g.i]:52;
 const integer=(n,min=0,max=100000)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 const validIds=(zones)=>zones.flat().filter(Boolean).every(c=>g.mode!=='fast'||(g.i===0?c.r>=6:g.i===2?c.si<2:g.i===3?c.r>=5:g.i===4?c.si<2&&c.r<=8:true));
 const exact=(zones)=>zones.flat().filter(Boolean).length===expected&&validIds(zones);
 const indices=(a,n)=>Array.isArray(a)&&a.every(j=>integer(j,0,n-1))&&new Set(a).size===a.length;
 
 if(g.i===0)return (g.hold==null||cardOK(g.hold))&&Array.isArray(g.cols)&&g.cols.length===(g.mode==='fast'?4:7)&&g.cols.every(pile)&&cards(g.stock)&&cards(g.waste)&&arr(g.found,4)&&g.found.every(cards)&&arr(g.powers,4)&&Number.isInteger(g.passes)&&uniqueZones([...g.cols.map(col=>col.map(x=>x.c)),g.stock,g.waste,...g.found,g.hold?[g.hold]:[]])&&exact([...g.cols.map(col=>col.map(x=>x.c)),g.stock,g.waste,...g.found,g.hold?[g.hold]:[]])&&integer(g.passes,0,1000)&&g.found.every((a,si)=>a.every((c,j)=>c.si===si&&c.r===(g.mode==='fast'?6:1)+j));
 if(g.i===1)return hands(g.hands)&&cards(g.stock)&&arr(g.discards,2)&&g.discards.every(cards)&&arr(g.melds,2)&&g.melds.every(v=>Array.isArray(v)&&v.every(cards))&&arr(g.points,2)&&g.points.every(Number.isFinite)&&[0,1].includes(g.player)&&['draw','play'].includes(g.phase)&&Array.isArray(g.selected)&&uniqueZones([...g.hands,g.stock,...g.discards,...g.melds.flat()])&&exact([...g.hands,g.stock,...g.discards,...g.melds.flat()])&&g.melds.flat().every(m=>m.length>=3&&validMeld(m))&&indices(g.selected,g.hands[0].length)&&(!g.using||g.hands[0].some(c=>c.id===g.using));
 if(g.i===2)return arr(g.slots,g.mode==='fast'?9:13)&&g.slots.every(c=>c===null||cardOK(c))&&cards(g.stock)&&Array.isArray(g.selected)&&Number.isInteger(g.removed)&&uniqueZones([g.slots,g.stock])&&integer(g.removed,0,expected)&&g.slots.filter(Boolean).length+g.stock.length+g.removed===expected&&validIds([g.slots,g.stock])&&indices(g.selected,g.slots.length)&&integer(g.pivot,0,100000);
 if(g.i===3){
  if(!hands(g.hands)||!cards(g.stock)||!arr(g.realms,4)||!g.realms.every(v=>Array.isArray(v)&&v.every(x=>x&&cardOK(x.c)&&[0,1].includes(x.owner)))||![0,1].includes(g.player)||!integer(g.round)||!integer(g.actions))return false;
  if(g.captured!==undefined&&!cards(g.captured))return false;
  const zones=[...g.hands,g.stock,...g.realms.map(a=>a.map(x=>x.c)),g.captured||[]];
  // Legacy invasions discarded the displaced card. New saves retain those cards
  // outside the board so uniqueness and total-card checks remain exact.
  return uniqueZones(zones)&&validIds(zones)&&(g.captured!==undefined?exact(zones):zones.flat().length<=expected);
 }
 if(g.i===4)return Array.isArray(g.cards)&&g.cards.length===(g.mode==='fast'?16:52)&&g.cards.every(c=>c===null||cardOK(c))&&Array.isArray(g.open)&&Array.isArray(g.known)&&typeof g.peek==='boolean'&&Number.isFinite(g.peekUntil)&&Number.isInteger(g.fail)&&uniqueZones([g.cards])&&validIds([g.cards])&&indices(g.open,g.cards.length)&&indices(g.known,g.cards.length)&&integer(g.fail)&&integer(g.streak)&&integer(g.exchanges)&&g.cards.filter(Boolean).length%2===0;
 return false;
}
export function hubWon(g){
 if(!g?.done)return false;
 if(g.i===0)return tombstoneWon(g);
 if(g.i===1)return (!g.stock.length||g.hands.some(hand=>!hand.length))&&g.points[0]>=g.points[1];
 if(g.i===2)return g.removed===(g.mode==='fast'?26:52)&&!g.stock.length&&g.slots.every(c=>c===null);
 if(g.i===3){const ended=g.round>=(g.mode==='fast'?8:19)||(!g.stock.length&&g.hands.every((hand,p)=>!kingdomOptions(g.realms,hand,p).length));const points=kingdomScores(g.realms);return ended&&points[0]>=points[1]}
 return g.i===4&&g.cards.every(c=>c===null);
}
export function readHubVictories(storage){
 const results=[];
 if(!storage){try{storage=globalThis.localStorage}catch(e){return results}}
 if(!storage)return results;
 for(const mode of ['normal','joker']){
  const suffix=mode==='joker'?'-joker':'';
  const keys=['fifty-two-save'+suffix,...ids.map(id=>'fifty-two-save-'+id+suffix)];
  for(const key of keys){
   try{
    const state=JSON.parse(storage.getItem(key));
    if(validHubSave(state)&&hubWon(state)&&(key==='fifty-two-save'+suffix||key==='fifty-two-save-'+ids[state.i]+suffix))results.push({id:ids[state.i],mode,state});
   }catch(e){}
  }
 }
 return results;
}
