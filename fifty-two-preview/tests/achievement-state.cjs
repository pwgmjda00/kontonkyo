'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../engine/achievements.js'),'utf8');
function setup(seed={}){
 const data=new Map(Object.entries(seed)),listeners={},events=[],claimed=new Set();let calls=0,fail=false;
 const localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};
 const window={addEventListener:(name,fn)=>listeners[name]=fn,dispatchEvent:event=>events.push(event),FiftyTwoJokers:{achievementReceipt:id=>claimed.has(id)?'legacy':null,async awardAchievementAsync(id){calls++;if(fail)return null;if(claimed.has(id))return null;claimed.add(id);return{id:'J'+claimed.size,name:'reward'}}}};
 const document={readyState:'loading',addEventListener:(name,fn)=>listeners['document:'+name]=fn};
 vm.runInNewContext(source,{window,document,localStorage,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},console:{warn(){}}});
 return {api:window.FiftyTwoAchievements,data,events,claimed,listeners,calls:()=>calls,fail:v=>fail=v};
}
(async()=>{
 let checks=0;const check=(condition,message)=>{assert.ok(condition,message);checks++};
 const initial=setup();check(initial.api.catalog.length===77,'all77 catalog');check(new Set(initial.api.catalog.map(x=>x.id)).size===77,'unique IDs');
 for(const {id}of initial.api.catalog){
  const s=setup();await s.api.recordWin(id);await s.api.recordWin(id);await s.api.reconcile();check(s.api.hasWin(id),id+' proof');check(s.claimed.size===1,id+' dedupe');check(s.events.length===1,id+' one notice');
  for(const suffix of ['wins','joker-wins']){const prior=setup({['fifty-two-'+id+'-'+suffix]:'1'});await prior.api.reconcile();check(prior.claimed.has(id),id+' legacy '+suffix)}
 }
 for(const id of ['index','jokers','joker-test','unknown','__proto__']){await initial.api.recordWin(id);check(!initial.api.hasWin(id),id+' excluded')}
 check(initial.events.length===0,'unknown IDs no reward');
 const evidence=[
  ['gin-rummy','fifty-two-gin-rummy-stats-v1',JSON.stringify({w:1,l:0,d:0})],
  ['gin-rummy','fifty-two-gin-rummy-stats-v1-joker',JSON.stringify({w:1,l:0,d:0})],
  ['indian-poker','fifty-two-record-indian-poker-joker',JSON.stringify({wins:1,losses:0,draws:0})],
  ['judgment','fifty-two-judgment-v1',JSON.stringify({phase:'finished',wins:[2,1,0],round:3,mode:'fast'})],
  ['paradox','fifty-two-paradox-v1-joker',JSON.stringify({phase:'done',round:7,mine:5,theirs:2})],
  ...['shift','informant','witness'].map(id=>[id,'fifty-two-'+id+'-v1-joker',JSON.stringify({phase:'done',round:5,score:0})]),
  ...['poker-squares','crossfire','fault-line'].map(id=>[id,'fifty-two-'+id+'-best','1']),
  ['crossfire','fifty-two-crossfire-joker-best','1'],['poker-squares','fifty-two-poker-squares-joker-best','1'],
  ['countdown','fifty-two-countdown-best','150']
 ];
 for(const [id,key,value]of evidence){const s=setup({[key]:value});await s.api.reconcile();check(s.claimed.has(id),id+' proved legacy '+key)}
 const invalid=[['countdown','fifty-two-countdown-best','100'],['the-answer','fifty-two-the-answer-best','100'],['paradox','fifty-two-paradox-v1',JSON.stringify({phase:'done',round:7,mine:1,theirs:2})],['judgment','fifty-two-judgment-v1',JSON.stringify({phase:'finished',wins:[1,2,0],round:3,mode:'fast'})],['shift','fifty-two-shift-v1',JSON.stringify({phase:'done',round:1,score:100})],['klondike','fifty-two-klondike-wins','-1'],['klondike','fifty-two-klondike-joker-wins','Infinity']];
 for(const [id,key,value]of invalid){const s=setup({[key]:value});await s.api.reconcile();check(!s.claimed.has(id),id+' no unproved reward')}
 const retry=setup();retry.fail(true);await retry.api.recordWin('memory');check(retry.api.hasWin('memory'),'proof survives reward save failure');check(retry.api.pending().includes('memory'),'null failed write remains pending');check(retry.events.some(e=>e.type==='fifty-two:achievement-pending'),'pending event visible to UX');retry.fail(false);await retry.api.reconcile();check(retry.claimed.has('memory'),'reward retry');check(retry.api.pending().length===0,'pending clears after persisted receipt');check(retry.events.some(e=>e.type==='fifty-two:achievement-updated'),'pending UI receives resolved status');
 const tab=setup();await tab.api.recordWin('memory');const before=tab.calls();for(const key of ['fifty-two-joker-state-v3','fifty-two-joker-state-v3-lease',null])tab.listeners.storage({key});await tab.api.settled();check(tab.calls()===before,'JOKER state/lease events cannot create reward feedback');
 tab.data.set('fifty-two-clock-joker-wins','1');tab.listeners.storage({key:'fifty-two-clock-joker-wins'});await tab.api.settled();check(tab.claimed.has('clock'),'another tab historical win reconciles');
 console.log('Achievement state: '+checks+' checks PASS');
})().catch(error=>{console.error(error);process.exitCode=1});
