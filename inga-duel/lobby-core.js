/* In-memory invite matchmaking for beta. Never exposes an opponent seat token.
   No persistence or cross-worker coordination: production needs a Durable Object. */
(function(root){
'use strict';
const Rooms=root.IngaRoom;
if(!Rooms)throw Error('room-core.js must load first');
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function createLobby(options={}){
 const {catalog,randomBytes,now=()=>Date.now(),ttlMs=15*60*1000,maxRooms=100}=options;
 if(!Array.isArray(catalog)||typeof randomBytes!=='function')throw Error('Catalog and secure randomBytes required');
 const rooms=new Map(), tokens=new Map();
 function bytes(n){const b=randomBytes(n);if(!b||b.length!==n||Array.from(b).some(x=>!Number.isInteger(x)||x<0||x>255))throw Error('Invalid secure random bytes');return b}
 function secret(){return Array.from(bytes(32),b=>b.toString(16).padStart(2,'0')).join('')}
 function code(){let result='';while(result.length<8){for(const b of bytes(12)){if(b<224)result+=ALPHABET[b%ALPHABET.length];if(result.length===8)break}}return result}
 function sweep(){const time=now();for(const [key,r] of rooms){if(r.expiresAt<=time){rooms.delete(key);tokens.delete(r.hostToken);if(r.guestToken)tokens.delete(r.guestToken)}}}
 function validateDeck(deck){if(!Array.isArray(deck)||deck.length!==12||deck.some(id=>!Number.isInteger(id)||!catalog.some(c=>c.id===id)))throw Error('Invalid 12-card deck');return deck.slice()}
 function create(deck){
  sweep();if(rooms.size>=maxRooms)return {ok:false,reason:'room_limit'};
  const hostDeck=validateDeck(deck);
  let invite;for(let i=0;i<10;i++){const next=code();if(!rooms.has(next)){invite=next;break}}
  if(!invite)return {ok:false,reason:'code_collision'};
  const hostToken=secret(),time=now();
  rooms.set(invite,{hostDeck,hostToken,guestToken:null,room:null,createdAt:time,expiresAt:time+ttlMs});
  tokens.set(hostToken,invite);
  return {ok:true,code:invite,token:hostToken,seat:0,expiresAt:time+ttlMs};
 }
 function join(invite,deck){
  sweep();if(typeof invite!=='string')return {ok:false,reason:'invalid_code'};
  const r=rooms.get(invite.toUpperCase());
  if(!r)return {ok:false,reason:'not_found'};
  if(r.guestToken)return {ok:false,reason:'room_full'};
  const guestDeck=validateDeck(deck),guestToken=secret();
  const seedBytes=bytes(4),seed=((seedBytes[0]<<24)|(seedBytes[1]<<16)|(seedBytes[2]<<8)|seedBytes[3])>>>0;
  const room=Rooms.createRoom({decks:[r.hostDeck,guestDeck],catalog,seed,randomToken:secret});
  r.room=room;r.guestToken=guestToken;tokens.set(guestToken,invite.toUpperCase());
  return {ok:true,code:invite.toUpperCase(),token:guestToken,seat:1,expiresAt:r.expiresAt};
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
  return r.room.submit(r.room.seats[seat].token,revision,command);
 }
 function close(token){
  sweep();const invite=tokens.get(token),r=rooms.get(invite);
  if(!r||r.hostToken!==token)return {ok:false,reason:'unauthorized'};
  rooms.delete(invite);tokens.delete(r.hostToken);if(r.guestToken)tokens.delete(r.guestToken);
  return {ok:true};
 }
 return Object.freeze({create,join,status,action,close,sweep,size:()=>rooms.size});
}
root.IngaLobby=Object.freeze({createLobby});
})(typeof globalThis!=='undefined'?globalThis:this);
