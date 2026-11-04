/* Deterministic match journal for future server authority.
   Only seed, deck IDs, seats and actions are persisted; card effects are rebuilt from catalog. */
(function(root){
'use strict';
const duel=root.IngaDuel;
if(!duel)throw Error('duel-engine.js must load first');
function normalizeDeck(ids,catalog){
 if(!Array.isArray(ids)||ids.length<1||ids.length>120)throw Error('Invalid deck length');
 return ids.map(id=>{
  if(!Number.isInteger(id))throw Error('Invalid card ID');
  const card=catalog.find(c=>c.id===id);
  if(!card||typeof card.act!=='function')throw Error('Unknown card ID: '+id);
  return card;
 });
}
function createJournal(deckIds,seed,catalog){
 if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('Invalid seed');
 if(!Array.isArray(deckIds)||deckIds.length!==2)throw Error('Two decks required');
 const decks=deckIds.map(ids=>normalizeDeck(ids,catalog));
 return {version:1,seed,decks:deckIds.map(ids=>ids.slice()),actions:[],match:duel.createMatch(decks,{seed})};
}
function fingerprint(value){const data=JSON.stringify(value);let h=2166136261;for(let i=0;i<data.length;i++){h^=data.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0')}
function payload(j){return {version:1,seed:j.seed,decks:j.decks.map(ids=>ids.slice()),actions:j.actions.map(e=>({seat:e.seat,action:{...e.action}}))}}
function replay(snapshot,catalog){
 if(!snapshot||typeof snapshot.checksum!=='string'||snapshot.checksum!==fingerprint({version:snapshot.version,seed:snapshot.seed,decks:snapshot.decks,actions:snapshot.actions}))throw Error('Journal checksum mismatch');
 if(!snapshot||snapshot.version!==1||!Array.isArray(snapshot.actions)||snapshot.actions.length>10000)throw Error('Invalid journal');
 const journal=createJournal(snapshot.decks,snapshot.seed,catalog);
 for(const event of snapshot.actions){
  if(!event||!Number.isInteger(event.seat)||!event.action||typeof event.action!=='object')throw Error('Invalid event');
  const action=event.action.type==='play'?{type:'play',uid:event.action.uid}:event.action.type==='fate'?{type:'fate'}:event.action.type==='end_turn'?{type:'end_turn'}:event.action.type==='relic'?{type:'relic',id:event.action.id}:null;
  if(!action)throw Error('Invalid action');
  const result=duel.apply(journal.match,event.seat,action);
  if(!result.ok)throw Error('Replay failed: '+result.reason);
  journal.actions.push({seat:event.seat,action});
 }
 return journal;
}
function dispatch(journal,seat,action){
 if(!journal||!journal.match||!Array.isArray(journal.actions))throw Error('Invalid journal');
 if(journal.actions.length>=10000)return {ok:false,reason:'action_limit'};
 if(!action||!['play','fate','end_turn','relic'].includes(action.type))return {ok:false,reason:'invalid_action'};
 const safe=action.type==='play'?{type:'play',uid:action.uid}:action.type==='relic'?{type:'relic',id:action.id}:{type:action.type};
 const result=duel.apply(journal.match,seat,safe);
 if(result.ok)journal.actions.push({seat,action:safe});
 return {ok:result.ok,reason:result.reason||null,view:result.ok?duel.publicView(journal.match,seat):null};
}
function exportJournal(journal){
 const data=payload(journal);return {...data,checksum:fingerprint(data)};
}
root.IngaJournal=Object.freeze({createJournal,replay,dispatch,exportJournal});
})(typeof globalThis!=='undefined'?globalThis:this);
