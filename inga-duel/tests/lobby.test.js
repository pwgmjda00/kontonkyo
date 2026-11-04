const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={};vm.createContext(ctx);
for(const file of ['battle-core.js','battle-rules.js','duel-engine.js','match-journal.js','room-core.js','lobby-core.js','cards.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx,{filename:file});
let counter=0,time=1000;
const randomBytes=n=>Uint8Array.from({length:n},(_,i)=>(counter++*17+i*13)%224);
const lobby=ctx.IngaLobby.createLobby({catalog:vm.runInContext('starter',ctx),randomBytes,now:()=>time,ttlMs:1000,activeTtlMs:1000});
const deck=vm.runInContext('starter.map(c=>c.id)',ctx);
function test(name,fn){fn();console.log('PASS '+name)}
const host=lobby.create(deck,'せかいのおわりに');
test('create invite and wait',()=>{assert.equal(host.ok,true);assert.equal(host.code.length,8);assert.equal(lobby.status(host.token).status,'waiting')});
test('invalid invite rejected',()=>assert.equal(lobby.join('INVALID!',deck).reason,'invalid_code'));
const guest=lobby.join(host.code,deck);
test('join and hide hands',()=>{assert.equal(guest.ok,true);assert.equal(lobby.status(guest.token).view.opponent.hand,undefined)});
test('third player blocked',()=>assert.equal(lobby.join(host.code,deck).reason,'room_full'));
test('unauthorized token blocked',()=>assert.equal(lobby.status('bad').reason,'unauthorized'));
test('authoritative action',()=>{assert.equal(lobby.action(host.token,0,{type:'end_turn'}).ok,true);assert.equal(lobby.status(guest.token).revision,1)});
test('expire room and tokens',()=>{time=2001;lobby.sweep();assert.equal(lobby.size(),0);assert.equal(lobby.status(host.token).reason,'unauthorized')});

test('duplicate invite rejected',()=>{time=3000;const a=lobby.create(deck,'あいうえおかきく');assert.equal(a.ok,true);assert.equal(lobby.create(deck,'あいうえおかきく').reason,'code_taken')});
test('wrong length rejected',()=>assert.equal(lobby.create(deck,'あいうえお').reason,'invalid_code'));
