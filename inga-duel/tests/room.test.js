const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={};vm.createContext(ctx);
for(const file of ['battle-core.js','battle-rules.js','duel-engine.js','match-journal.js','room-core.js','cards.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx,{filename:file});
const {createRoom,restoreRoom}=ctx.IngaRoom;
const deck=Array.from({length:12},(_,i)=>ctx.starter[i].id);
let counter=0;
const token=()=>String(++counter).padStart(32,'x');
const options={decks:[deck,deck],catalog:ctx.starter,seed:42,randomToken:token};
const room=createRoom(options),[a,b]=room.seats;
const check=(name,fn)=>{fn();console.log('PASS '+name)};
check('private opponent hand',()=>{const v=room.snapshot(a.token);assert.equal(v.view.opponent.hand,undefined);assert.equal(v.view.player.hand.length,5)});
check('reject invalid token',()=>assert.equal(room.snapshot('wrong').reason,'unauthorized'));
check('reject opponent turn',()=>assert.equal(room.submit(b.token,0,{type:'end_turn'}).reason,'not_your_turn'));
check('reject stale revision',()=>assert.equal(room.submit(a.token,1,{type:'end_turn'}).reason,'stale_revision'));
check('accept valid turn and reconnect',()=>{assert.equal(room.submit(a.token,0,{type:'end_turn'}).ok,true);assert.equal(room.reconnect(b.token,0).changed,true)});
check('restore state with new tokens',()=>{const saved=room.exportForServer();const restored=restoreRoom(saved,options);assert.equal(restored.exportForServer().revision,1);assert.deepEqual(JSON.parse(JSON.stringify(restored.snapshot(restored.seats[1].token).view)),JSON.parse(JSON.stringify(room.snapshot(b.token).view)))});
check('reject tampered journal',()=>{const saved=room.exportForServer();saved.journal.actions[0].seat=1;assert.throws(()=>restoreRoom(saved,options),/checksum/)});
