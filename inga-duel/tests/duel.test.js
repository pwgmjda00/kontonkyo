const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ctx={};vm.createContext(ctx);
for(const file of ['battle-core.js','duel-engine.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
const {createMatch,apply,publicView}=ctx.IngaDuel;
const card={id:1,name:'strike',cost:1,desc:'hit',act:(a,b,ctx)=>ctx.hit(b,7)};
const deck=()=>Array.from({length:12},()=>card);
function test(name,fn){fn();console.log('PASS '+name)}
test('same seed yields same starting hand',()=>{const a=createMatch([deck(),deck()],{seed:7}),b=createMatch([deck(),deck()],{seed:7});assert.deepEqual(JSON.parse(JSON.stringify(publicView(a,0))),JSON.parse(JSON.stringify(publicView(b,0))))});
test('rejects opponent actions',()=>{const m=createMatch([deck(),deck()]);assert.equal(apply(m,1,{type:'end_turn'}).reason,'not_your_turn')});
test('rejects invented cards',()=>{const m=createMatch([deck(),deck()]);assert.equal(apply(m,0,{type:'play',uid:9999}).ok,false)});
test('card effects and turn switching',()=>{const m=createMatch([deck(),deck()]);const uid=publicView(m,0).player.hand[0].uid;assert.equal(apply(m,0,{type:'play',uid}).ok,true);assert.equal(m.state.players[1].hp,33);assert.equal(apply(m,0,{type:'end_turn'}).ok,true);assert.equal(m.state.active,1)});
test('opponent hidden hand',()=>{const m=createMatch([deck(),deck()]);const view=publicView(m,0);assert.equal(view.opponent.hand,undefined);assert.equal(view.opponent.handCount,5);assert.equal(view.player.hand.length,5)});
test('rejects invalid seats',()=>{const m=createMatch([deck(),deck()]);assert.throws(()=>publicView(m,2))});
