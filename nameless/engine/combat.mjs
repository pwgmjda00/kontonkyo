export const elements=['physical','magic','mental','abyss','concept'];
export function affinity(a,b){const i=elements.indexOf(a),j=elements.indexOf(b);if(i<0||j<0)throw Error('invalid element');return (i+1)%5===j?1.5:(j+1)%5===i?.75:1;}
export function damage(attack,power,resistance,a,b){if([attack,power,resistance].some(v=>!Number.isFinite(v)||v<0))throw Error('invalid combat stat');return attack*power*100/(100+resistance)*affinity(a,b);}
