/* FIFTY-TWO score-mode bridge. Does not alter underlying game rules or best scores. */
(function(root){'use strict';
const engine=root.FiftyTwoJokers;
function compute(mode,joker,base,ctx={}){
 if(!Number.isFinite(base)||base<0)throw new RangeError('base score must be nonnegative and finite');
 return mode==='joker'&&joker&&engine ? engine.applyScore(joker,base,ctx) :
  {score:base,delta:0,description:'通常スコア'};
}
function create(game,{reset,hasProgress}={}){
 if(!/^[a-z0-9-]+$/.test(game))throw new Error('invalid game id');
 if(typeof reset!=='function'||typeof hasProgress!=='function')throw new Error('missing score mode callbacks');
 if(!engine)throw new Error('JOKER engine not loaded');
 const key='fifty-two-mode-'+game;
 let mode='normal',joker=null,host=null,info=null,status=null,ability=null,normal=null,boosted=null;
 try{mode=localStorage.getItem(key)==='joker'?'joker':'normal'}catch(e){}
 function refreshEquip(){joker=mode==='joker'?engine.equipped():null}
 refreshEquip();
 function build(){
  if(host){if(!host.isConnected){const main=document.querySelector('main');if(main)main.append(host)}return;}
  const main=document.querySelector('main');
  if(!main)throw new Error('game main missing');
  const style=document.createElement('style');style.textContent=`
.ft-joker-mode{border:1px solid #ac8bb9;border-radius:13px;background:#221d2b;color:#f7f1fa;padding:12px 13px;margin:12px 0;font:14px/1.5 system-ui,sans-serif}
.ft-joker-mode .ft-joker-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
.ft-joker-mode button{border:1px solid #b5a1c4;border-radius:9px;padding:10px 13px;min-height:44px;min-width:94px;background:#383148;color:#fff;font:700 14px system-ui;cursor:pointer;touch-action:manipulation}
.ft-joker-mode button[aria-pressed="true"]{background:#ffe29b;color:#211827;border-color:#ffe29b}
.ft-joker-mode button:focus-visible,.ft-joker-mode a:focus-visible{outline:3px solid #fff;outline-offset:3px}
.ft-joker-mode a{color:#f7dca9;font-weight:650}
.ft-joker-mode .ft-joker-status{color:#d8ccdd;font-size:13px;margin:6px 0}
.ft-joker-mode .ft-joker-ability{font-size:14px;color:#d7f5ec;margin:6px 0;font-weight:650;line-height:1.6}
.ft-joker-mode .ft-joker-ability:empty{display:none}
.ft-joker-mode .ft-joker-result{font-size:15px;font-weight:800;color:#fff2c6}
.ft-joker-mode .ft-joker-result:empty{display:none}
`;document.head.append(style);
  host=document.createElement('section');host.className='ft-joker-mode';host.setAttribute('aria-label','ジョーカーモード');
  const controls=document.createElement('div');controls.className='ft-joker-controls';
  const label=document.createElement('strong');label.textContent='🃏 JOKER';
  normal=document.createElement('button');normal.type='button';normal.textContent='⚖️ 通常';
  boosted=document.createElement('button');boosted.type='button';boosted.textContent='🃏 JOKER';
  const link=document.createElement('a');link.href='./jokers.html';link.textContent='今日の7枚・装備';
  controls.append(label,normal,boosted,link);
  info=document.createElement('div');info.className='ft-joker-status';info.setAttribute('aria-live','polite');
  ability=document.createElement('div');ability.className='ft-joker-ability';ability.setAttribute('aria-live','polite');
  status=document.createElement('div');status.className='ft-joker-result';status.setAttribute('aria-live','polite');
  const foot=document.createElement('small');foot.textContent='JOKER得点は終了時に別枠で計算。対応する作品では追加のカード能力も発動します。通常モードの記録とは分けて扱います。';
  host.append(controls,info,ability,status,foot);
  normal.onclick=()=>change('normal');boosted.onclick=()=>change('joker');
  const panel=main.querySelector('section.panel');
  if(panel)main.insertBefore(host,panel);else main.append(host);
 }
 function change(next){
  if(mode===next)return;
  if(hasProgress()&&!confirm('モードを変えると現在の対局がリセットされます。続けますか？'))return;
  mode=next;try{localStorage.setItem(key,mode)}catch(e){}
  refreshEquip();reset();
 }
 function refresh({base=0,finished=false,round=1,totalRounds=1,win=false,streak=0,behind=false,tie=false,previousScore=null,abilityText=''}={}){
  build();
  normal.setAttribute('aria-pressed',String(mode==='normal'));
  boosted.setAttribute('aria-pressed',String(mode==='joker'));
  info.textContent=mode==='normal'?'通常ルール。JOKER補正なし。':joker?
   '装備中：'+joker.icon+' '+joker.name+'｜'+joker.description+'（終了時に精算）':
   '本日のJOKERが未装備です。図鑑で7枚から1枚を装備してください。';
  ability.textContent=mode==='joker'&&joker?abilityText:'';
  const ctx={round,totalRounds,final:finished,win,streak,behind,tie,previousScore};
  const result=compute(mode,joker,base,ctx);
  status.textContent=finished&&mode==='joker'&&joker?
   '🃏 最終JOKER得点 '+result.score+'点（通常 '+base+'点、補正 '+(result.delta>=0?'+':'')+result.delta+'点）':
   '';
  return result;
 }
 return Object.freeze({refresh,begin:refreshEquip,get mode(){return mode},get joker(){return joker},get panel(){return host}});
}
const api=Object.freeze({create,compute});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.FiftyTwoJokerScoreMode=api;
})(typeof window!=='undefined'?window:globalThis);
