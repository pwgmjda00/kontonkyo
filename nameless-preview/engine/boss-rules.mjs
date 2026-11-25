import {elements} from './combat.mjs';
// Rules apply only to chapter encounters, not generic battles.
export const bossHints={hungry_forest:'食料2で敵の攻撃を半減（攻撃ごと）',librarian:'知識20以上で敵の防御を半減（消費なし）',thousand_eyes:'直前と同じ属性の攻撃は威力75%。属性を変えると解除'};
export function bossDefense(b,target,element,resistance,state){return b.chapterBoss==='librarian'&&b.enemies.includes(target)&&(state?.resources.knowledge??0)>=20?resistance/2:resistance;}
export function bossHit(b,u,target,element,hit,state){if(b.chapterBoss==='hungry_forest'&&b.enemies.includes(u)&&state?.resources.food>=2){state.resources.food-=2;return hit*.5;}if(b.chapterBoss==='thousand_eyes'&&b.enemies.includes(target)){const repeat=target.lastElement===element;target.lastElement=element;return repeat?hit*.75:hit;}if(b.chapterBoss==='bodiless_beast'&&b.enemies.includes(target)&&element==='physical')return hit*.6;if(b.chapterBoss==='dreaming_giant')return hit*(b.enemies.includes(target)?(b.elapsed%6000<3000?1.4:1):(b.elapsed%6000>=3000?1.25:1));if(b.chapterBoss==='law_executor'&&b.enemies.includes(target)&&Math.floor(b.elapsed/4000)%2===0&&element==='physical')return hit*.75;if(b.chapterBoss==='nameless_boss'&&b.enemies.includes(target)){const seen=target.recentElements??[];const repeat=seen.includes(element);target.recentElements=[...seen,element].slice(-2);return repeat?hit*(b.cloudedMirror ? .95 : .8):hit*1.1;}return hit;}
Object.assign(bossHints,{bodiless_beast:'物理攻撃の威力60%。他属性は通常通り',dreaming_giant:'6秒周期。前半3秒は眠り攻撃せず、被ダメージ増加。後半は攻撃強化',past_self:'主人公の攻撃力の20%を追加攻撃力として模倣',causal_serpent:'3秒ごとに直前3秒間の被ダメージの8%を反射（最大12）'});
export function bossSetup(b){if(b.chapterBoss==='past_self')b.enemies[0].attack+=b.allies[0].attack*.2;}
export function bossTurn(b,u){if(b.chapterBoss==='dreaming_giant'&&b.enemies.includes(u)&&b.elapsed%6000<3000)return false;return true;}
export function bossAfterHit(b,u,target,before){if(b.chapterBoss==='causal_serpent'&&b.enemies.includes(target))target.echoDamage=(target.echoDamage??0)+Math.max(0,before-target.hp);}
export function bossEcho(b,u,target){if(b.chapterBoss!=='causal_serpent'||!b.enemies.includes(u)||b.elapsed%3000!==0)return 0;const hit=Math.min(12,(u.echoDamage??0)*.08);u.echoDamage=0;return hit;}

Object.assign(bossHints,{time_keeper:'4秒周期。後半2秒は敵の攻撃間隔が短縮',law_executor:'4秒ごとに物理軽減25%と通常状態を交替',perfect_god:'3秒ごとに防御属性が変化',nameless_boss:'直近2撃と同じ属性は威力80%、異なる属性は110%'});
export function bossBeforeAttack(b,target){if(b.chapterBoss==='perfect_god'&&b.enemies.includes(target))target.element=elements[(4+Math.floor(b.elapsed/3000))%5];}
export function bossPeriod(b,u){return b.chapterBoss==='time_keeper'&&b.enemies.includes(u)&&b.elapsed%4000>=2000?Math.ceil(u.period*.75):u.period;}

export function encounterHint(id, mirror) {
  if (id === 'nameless_boss' && mirror) return '曇り鏡：直近2撃と同じ属性は威力95%、異なる属性は110%';
  return bossHints[id];
}
