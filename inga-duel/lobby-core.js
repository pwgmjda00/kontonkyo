/* In-memory invite matchmaking for beta. Never exposes an opponent seat token.
   No persistence or cross-worker coordination: production needs a Durable Object. */
(function(root){
'use strict';
const Rooms=root.IngaRoom;
if(!Rooms)throw Error('room-core.js must load first');
const HIRAGANA=/^[ぁ-ゖ]{8}$/u;
 function normalizeCode(value){return typeof value==='string'?value.normalize('NFKC'):''}
function createLobby(options={}){
 const {catalog,randomBytes,now=()=>Date.now(),ttlMs=15*60*1000,activeTtlMs=6*60*60*1000,maxRooms=100}=options;
 if(!Array.isArray(catalog)||typeof randomBytes!=='function')throw Error('Catalog and secure randomBytes required');
 const rooms=new Map(), tokens=new Map(),subscribers=new Map();
 function bytes(n){const b=randomBytes(n);if(!b||b.length!==n||Array.from(b).some(x=>!Number.isInteger(x)||x<0||x>255))throw Error('Invalid secure random bytes');return b}
 function secret(){return Array.from(bytes(32),b=>b.toString(16).padStart(2,'0')).join('')}
 function sweep(){const time=now();for(const [key,r] of rooms){if(r.expiresAt<=time){rooms.delete(key);tokens.delete(r.hostToken);if(r.guestToken)tokens.delete(r.guestToken);notify(key);subscribers.delete(key)}}}
 function validateDeck(deck){if(!Array.isArray(deck)||![12,30].includes(deck.length)||deck.some(id=>!Number.isInteger(id)||!catalog.some(c=>c.id===id)))throw Error('Invalid 30-card deck');return deck.slice()}
 function create(deck,requestedCode){
  sweep();if(rooms.size>=maxRooms)return {ok:false,reason:'room_limit'};
  const hostDeck=validateDeck(deck);
  const invite=normalizeCode(requestedCode);
  if(!HIRAGANA.test(invite))return {ok:false,reason:'invalid_code'};
  if(rooms.has(invite))return {ok:false,reason:'code_taken'};
  const hostToken=secret(),time=now();
  rooms.set(invite,{hostDeck,hostToken,guestToken:null,room:null,createdAt:time,expiresAt:time+ttlMs});
  tokens.set(hostToken,invite);
  return {ok:true,code:invite,token:hostToken,seat:0,expiresAt:time+ttlMs};
 }
 function join(invite,deck){
  sweep();if(typeof invite!=='string')return {ok:false,reason:'invalid_code'};
  const normalized=normalizeCode(invite);
  if(!HIRAGANA.test(normalized))return {ok:false,reason:'invalid_code'};
  const r=rooms.get(normalized);
  if(!r)return {ok:false,reason:'not_found'};
  if(r.guestToken)return {ok:false,reason:'room_full'};
  const guestDeck=validateDeck(deck),guestToken=secret();
  const seedBytes=bytes(4),seed=((seedBytes[0]<<24)|(seedBytes[1]<<16)|(seedBytes[2]<<8)|seedBytes[3])>>>0;
  const room=Rooms.createRoom({decks:[r.hostDeck,guestDeck],catalog,seed,randomToken:secret});
  r.room=room;r.guestToken=guestToken;r.expiresAt=now()+activeTtlMs;tokens.set(guestToken,normalized);notify(normalized);
  return {ok:true,code:normalized,token:guestToken,seat:1,expiresAt:r.expiresAt};
 }
 function status(token){
  sweep();const invite=tokens.get(token),r=rooms.get(invite);
  if(!r||!(token===r.hostToken||token===r.guestToken))return {ok:false,reason:'unauthorized'};
  const seat=token===r.hostToken?0:1;
  if(!r.room)return {ok:true,code:invite,seat,status:'waiting',expiresAt:r.expiresAt};
  const state=r.room.snapshot(r.room.seats[seat].token);
  return {ok:true,code:invite,seat,status:state.view.over?'finished':'playing',revision:state.revision,view:state.view,expiresAt:r.expiresAt};
 }
 function action(token,revision,command){
  sweep();const invite=tokens.get(token),r=rooms.get(invite);
  if(!r||!(token===r.hostToken||token===r.guestToken))return {ok:false,reason:'unauthorized'};
  if(!r.room)return {ok:false,reason:'waiting'};
  const seat=token===r.hostToken?0:1;
  const result=r.room.submit(r.room.seats[seat].token,revision,command);
  if(result.ok)notify(invite);
  return result;
 }
 function subscribe(token,callback){
  const state=status(token);
  if(!state.ok)return {ok:false,reason:'unauthorized'};
  if(typeof callback!=='function')throw Error('Invalid subscriber');
  let listeners=subscribers.get(state.code);
  if(!listeners){listeners=new Set();subscribers.set(state.code,listeners)}
  listeners.add(callback);
  return {ok:true,unsubscribe:()=>{listeners.delete(callback);if(!listeners.size)subscribers.delete(state.code)}};
 }
 function notify(code){const listeners=subscribers.get(code);if(listeners)for(const fn of [...listeners]){try{fn()}catch(_){}}}
 function close(token){
  sweep();const invite=tokens.get(token),r=rooms.get(invite);
  if(!r||r.hostToken!==token)return {ok:false,reason:'unauthorized'};
  rooms.delete(invite);tokens.delete(r.hostToken);if(r.guestToken)tokens.delete(r.guestToken);notify(invite);subscribers.delete(invite);
  return {ok:true};
 }
 return Object.freeze({create,join,status,action,close,subscribe,sweep,size:()=>rooms.size});
}
root.IngaLobby=Object.freeze({createLobby});
})(typeof globalThis!=='undefined'?globalThis:this);
