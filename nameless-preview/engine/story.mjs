export const chapterStory=Object.freeze([
 ['awakening','目覚め','知らない天井だった。外から、木を割る音がする。'],
 ['labor','最初の労働','手のひらに豆ができた。今日の食事は買えそうだ。'],
 ['village','村の記憶','村の古い地図には、井戸だけが描かれていない。'],
 ['keeper','井戸守','井戸守は水面を見たまま言った。「覗くなら、昼にしなさい」'],
 ['daystar','昼の星','水面に星が映っている。見上げても、空には太陽しかない。'],
 ['night','存在しない夜空','森の奥で見た星座を、村の誰も知らなかった。']
]);
export function storyLog(s){const f=s.worldFlags??{};return chapterStory.filter((_,i)=>[true,f.trust,f.build,f.well,f.star,f.hungry_forest][i]).map(([id,title,text])=>({id,title,text}));}
export function contractFirst(s){if(!s.worldFlags?.well_guard)throw Error('contract locked');if(s.worldFlags.firstContract)return false;s.worldFlags.firstContract=true;s.availableWorkers??=[];if(!s.availableWorkers.includes('primordial_slime'))s.availableWorkers.push('primordial_slime');return true;}
export function validateChapter(s){const f=s.worldFlags??{};if(s.chapter!==undefined&&(!Number.isInteger(s.chapter)||s.chapter<1||s.chapter>6))throw Error('invalid chapter');for(const k of ['build','trust','well','star','well_guard','hungry_forest','firstContract'])if(f[k]!==undefined&&typeof f[k]!=='boolean')throw Error('invalid chapter flag');if(f.star&&!f.well||f.well_guard&&!f.well||f.hungry_forest&&(!f.well_guard||!f.star)||f.firstContract&&!f.well_guard)throw Error('invalid chapter sequence');if(f.firstContract&&!(s.availableWorkers??[]).includes('primordial_slime'))throw Error('missing companion');if(s.battle?.chapterBoss!==undefined&&!['well_guard','hungry_forest'].includes(s.battle.chapterBoss))throw Error('invalid chapter boss');}
