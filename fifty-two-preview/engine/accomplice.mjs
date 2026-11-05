// Accomplice rules: pure, DOM-independent helpers. Cards have {r,si,id}.
export function validMeld(cards){
 if(!Array.isArray(cards)||cards.length<3||cards.some(c=>!c||!Number.isInteger(c.r)||!Number.isInteger(c.si)))return false;
 if(new Set(cards.map(c=>c.id)).size!==cards.length)return false;
 const sameRank=cards.length<=4&&cards.every(c=>c.r===cards[0].r)&&new Set(cards.map(c=>c.si)).size===cards.length;
 const ordered=[...cards].sort((a,b)=>a.r-b.r);
 const run=cards.every(c=>c.si===cards[0].si)&&ordered.every((c,i)=>i===0||c.r===ordered[i-1].r+1);
 return sameRank||run;
}
export function meldScore(cards){return cards.length===3?15:cards.length===4?25:25+(cards.length-4)*10}
export function royalty(score){return Math.ceil(score*.3)}
export function handPenalty(hand){return hand.reduce((n,c)=>n+(c.r>10?10:c.r),0)}
export function finalPoints(points,hands){return points.map((p,i)=>p-handPenalty(hands[i]))}
export function cpuMeld(hand){for(let i=0;i<hand.length;i++)for(let j=i+1;j<hand.length;j++)for(let k=j+1;k<hand.length;k++){let cards=[hand[i],hand[j],hand[k]];if(validMeld(cards))return cards}return null}
export function cpuDiscard(hand,royaltyId=null){const sorted=[...hand].sort((a,b)=>a.r-b.r);const idx=royaltyId===null?-1:sorted.findIndex(c=>c.id===royaltyId);return sorted[idx>=0?idx:sorted.length-1]??null}