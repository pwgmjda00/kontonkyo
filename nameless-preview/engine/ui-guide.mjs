import {actions} from './actions.mjs';
import {effectiveCost} from './mastery.mjs';
import {output,researchEffects} from './production.mjs';
const actionNames={refine:"魔力精製",gather:"採集",chop:"伐採",work:"労働",farm:"農耕",causalObserve:"因果観測",possibilityExtract:"可能性の抽出",read:"読書",observe:"異界観測",timelineExplore:"世界線探索",alienGather:"異界素材採取",timeStore:"時間蓄積"};
const names={hp:'体力',food:'食料',material:'素材',gold:'金貨',knowledge:'知識',will:'意志',mana:'魔力',causality:'因果',time:'時間',truth:'真理'};
const special={build:'村の施設を解放',well:'井戸の秘密を調べる',star:'新しい観測へ進む',sense:'魔力精製を解放',forbidden:'精神防護と異界観測を解放',ward:'章ボスへの挑戦を解放・戦闘耐性 +10',magicResearch:'職業修練を解放',martialResearch:'職業修練を解放・戦闘攻撃力 +20%',lawConservation:'食料・素材・金貨・魔力の消費 −20%（全作業者）',gate:'第三章への道を開く'};
export function actionDetail(s,id){const a=actions[id];return [...Object.entries(effectiveCost(s,id,a.cost)).map(([k,v])=>`${names[k]??k} −${Number(v.toFixed(2))}`),...Object.entries(output(s,id)).map(([k,v])=>`${names[k]??k} +${Number(v.toFixed(2))}`),...(a.stat?['筋力 +1']:[]),...(special[id]?[special[id]]:[]),...(researchEffects[id]?[`研究効果：${Object.entries(researchEffects[id]).map(([k,v])=>`${actionNames[k]??k} +${Math.round((v-1)*100)}%`).join("、")}`]:[])].join(' / ');}
export function nextHint(s){const f=s.worldFlags??{},r=s.resources,u=s.unlocked;if(s.battle&&!s.battle.result)return '戦闘中。決着を待とう。';if(r.hp<3&&!hintGoesToBattle(s))return '体力が少ない。休息や食事で回復しよう。';if(s.chapter===6&&u.includes('discardName')&&!f.discardName)return '行動から「名を捨てる」を選べる。';if(s.chapter===6)return !f.freeWill?"自己・概念・無限を研究し、生命と自由意志を観測しよう。":!f.perfect_god?"完全なる神に挑もう。":!f.nameless_boss?"無名に挑もう。":!f.universeChoice?"創造権を獲得し、宇宙を選択しよう。":"宇宙の行方を選ぼう。";if(s.chapter===5)return !f.lawObserve?'法則を観測しよう。':!f.lawSynthesis?'真理を抽出し、六つの法則から三つを研究しよう。':!f.lawEdit?'法則を編集しよう。':!f.divinity?'神格を形成しよう。':!f.time_keeper?'時間の墓守に挑もう。':!f.law_executor?'法則の執行者に挑もう。':!f.cosmosDecode?'宇宙を解読しよう。':'第六章へ進める。';if(s.chapter===4)return !f.pastDialogue?'前世との対話を行おう。':!f.memoryRestore?'記憶を復元しよう。':!f.pastSummon?'前世召喚を調べよう。':!u.includes('timelineExplore')?'因果観測を行おう。':!u.includes('possibilityExtract')?'世界線探索を行おう。':!f.past_self?'過去の自分に挑もう。':!f.causal_serpent?'因果の蛇に挑もう。':!f.pastRewrite?'過去を改変しよう。':!f.timelineMerge?'因果と時間を集め、世界線を統合しよう。':'第五章へ進める。';if(s.chapter===3)return !u.includes('alienGather')?'異界探索で深淵20を集めよう。':!f.bodiless_beast?'肉体なき獣に挑もう。':!f.dreaming_giant?'夢見る巨人に挑もう。':!f.soulObserve?'魂を観測しよう。':!f.soulExtracted?'魂を抽出しよう。':'第四章へ進める。';if(s.chapter===2)return !f.sense?'瞑想で意志10を集め、魔力感知を行おう。':!f.forbidden?'知識60で禁書を解読しよう。':!f.ward?'意志5で精神防護を行おう。':!f.librarian?'修行して禁書の司書に挑もう。':!f.thousand_eyes?'千の眼に挑もう。':!f.gate?'魔力20と意志10で門を開こう。':'第三章へ進める。';if(!u.includes('work'))return `伐採で素材を10集めると労働が解放される（現在 ${Number(r.material.toFixed(1))}/10）。`;if(!f.build)return r.gold<15?'労働で金貨を15集めよう。':'素材10と金貨15で建築しよう。';if(!f.well)return '読書で知識を20集め、井戸を調査しよう。';if(!f.well_guard)return (s.stats.strength??0)<2?'井戸の番人は筋力2が目安。修行で筋力を上げられる。':'井戸の番人に挑んでみよう。';if(!f.star)return '星の観測を完了しよう。';if(!f.hungry_forest)return '修行で筋力を上げ、飢えた森に挑もう。';return '第二章へ進める。';}

export function hintGoesToBattle(s) {
  if (s.battle && !s.battle.result) return true;
  const f = s.worldFlags ?? {};
  switch (s.chapter ?? 1) {
    case 1: return Boolean(f.well && (!f.well_guard || f.star));
    case 2: return Boolean(f.ward && (!f.thousand_eyes || f.gate));
    case 3: return s.unlocked.includes('alienGather') && (!f.dreaming_giant || !!f.soulExtracted);
    case 4: return s.unlocked.includes('possibilityExtract') && (!f.causal_serpent || !!f.timelineMerge);
    case 5: return Boolean(f.divinity && (!f.law_executor || f.cosmosDecode));
    case 6: return Boolean(f.freeWill && (!f.nameless_boss || f.universeChoice)) &&
      !(s.unlocked.includes('discardName') && !f.discardName);
    default: return false;
  }
}
