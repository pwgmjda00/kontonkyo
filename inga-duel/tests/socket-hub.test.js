const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={};vm.createContext(ctx);
for(const file of ['battle-core.js','battle-rules.js','duel-engine.js','match-journal.js','room-core.js','socket-hub.js','cards.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx,{filename:file});
const deck=ctx.starter.map(c=>c.id);let seq=0;
const room=ctx.IngaRoom.createRoom({decks:[deck,deck],catalog:ctx.starter,seed:9,randomToken:()=>String(++seq).padStart(32,'t')});
const hub=ctx.IngaSocketHub.createSocketHub(room);
function socket(){
 const listeners={};const out=[];
 return {out,send(s){out.push(JSON.parse(s))},addEventListener(type,fn){listeners[type]=fn},
 emit(obj){listeners.message({data:JSON.stringify(obj)})},close(){listeners.close()}};
}
const a=socket(),b=socket(),stranger=socket();
hub.attach(a);hub.attach(b);hub.attach(stranger);
const [seatA,seatB]=room.seats;
function test(name,fn){fn();console.log('PASS '+name)}
test('unauthenticated actions rejected',()=>{stranger.emit({type:'action',revision:0,action:{type:'end_turn'}});assert.equal(stranger.out.at(-1).reason,'unauthorized')});
test('authentication and hidden opponent cards',()=>{a.emit({type:'hello',token:seatA.token,revision:0});b.emit({type:'hello',token:seatB.token,revision:0});assert.equal(a.out.at(-1).type,'welcome');assert.equal(b.out.at(-1).view.opponent.hand,undefined)});
test('broadcast correct seat views',()=>{a.emit({type:'action',revision:0,action:{type:'end_turn'}});assert.equal(a.out.at(-1).revision,1);assert.equal(b.out.at(-1).seat,1)});
test('stale action rejected',()=>{b.emit({type:'action',revision:0,action:{type:'end_turn'}});assert.equal(b.out.at(-1).reason,'stale_revision')});
test('sync after disconnect',()=>{b.close();assert.equal(hub.connected(),1);const reconnect=socket();hub.attach(reconnect);reconnect.emit({type:'hello',token:seatB.token,revision:0});assert.equal(reconnect.out.at(-1).changed,true)});
test('bad JSON rejected',()=>{a.emit({type:'sync',revision:1});assert.equal(a.out.at(-1).type,'state')});
