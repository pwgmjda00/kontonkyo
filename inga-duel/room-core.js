/* In-memory authoritative room prototype. Transport-independent; not production auth.
   Load after battle-core, battle-rules, duel-engine and match-journal. */
(function(root){
'use strict';
const journalAPI=root.IngaJournal, duel=root.IngaDuel;
if(!journalAPI||!duel)throw Error('Load IngaJournal and IngaDuel first');
function createRoom(options){
 const {decks,catalog,seed=1,randomToken}=options||{};
 if(typeof randomToken!=='function')throw Error('Secure token generator required');
 const tokens=[randomToken(),randomToken()];
 if(tokens.some(t=>typeof t!=='string'||t.length<32)||tokens[0]===tokens[1])throw Error('Invalid seat tokens');
 const journal=journalAPI.createJournal(decks,seed,catalog);
 let revision=0;
 function seatOf(token){return tokens.indexOf(token)}
 function snapshot(token){
  const seat=seatOf(token);
  if(seat<0)return {ok:false,reason:'unauthorized'};
  return {ok:true,revision,seat,view:duel.publicView(journal.match,seat)};
 }
 function submit(token,expectedRevision,action){
  const seat=seatOf(token);
  if(seat<0)return {ok:false,reason:'unauthorized'};
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision!==revision)return {ok:false,reason:'stale_revision',revision};
  const result=journalAPI.dispatch(journal,seat,action);
  if(!result.ok)return {ok:false,reason:result.reason,revision};
  revision++;
  return {ok:true,revision,view:duel.publicView(journal.match,seat)};
 }
 function reconnect(token,lastRevision){
  const result=snapshot(token);
  if(!result.ok)return result;
  return {...result,changed:lastRevision!==revision};
 }
 return Object.freeze({
  seats:tokens.map((token,seat)=>Object.freeze({seat,token})),
  snapshot,submit,reconnect,
  exportForServer:()=>({revision,journal:journalAPI.exportJournal(journal)})
 });
}
function restoreRoom(saved,options){
 if(!saved||!Number.isSafeInteger(saved.revision)||saved.revision<0)throw Error('Invalid revision');
 const {catalog,randomToken}=options||{};
 const rebuilt=journalAPI.replay(saved.journal,catalog);
 if(saved.revision!==rebuilt.actions.length)throw Error('Revision mismatch');
 // New seat tokens are intentionally issued on restore. Persist auth separately for real reconnects.
 const room=createRoom({decks:saved.journal.decks,catalog,seed:saved.journal.seed,randomToken});
 for(const event of rebuilt.actions){
  const res=room.submit(room.seats[event.seat].token,room.exportForServer().revision,event.action);
  if(!res.ok)throw Error('Room restore failed: '+res.reason);
 }
 return room;
}
root.IngaRoom=Object.freeze({createRoom,restoreRoom});
})(typeof globalThis!=='undefined'?globalThis:this);
