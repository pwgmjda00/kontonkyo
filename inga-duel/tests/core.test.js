/* Developer-only smoke tests. Run with: node inga-duel/tests/core.test.js */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'battle-core.js'),'utf8'),ctx);
const core=ctx.IngaCore;
function test(name,fn){fn();console.log('PASS '+name)}
test('damage respects block',()=>{const x={hp:40,block:8};assert.equal(core.damage(x,12).dealt,4);assert.equal(x.hp,36);assert.equal(x.block,0)});
test('heal respects max HP',()=>{const x={hp:51,maxHp:70};core.heal(x,30);assert.equal(x.hp,70)});
test('reject unknown actions',()=>assert.equal(core.validateAction({over:false,player:{hand:[],energy:5,fate:0}},{type:'cheat'}).ok,false));
test('reject forged cards',()=>assert.equal(core.validateAction({over:false,player:{hand:[],energy:5,fate:0}},{type:'play',uid:999}).ok,false));
test('accept owned affordable card',()=>assert.equal(core.validateAction({over:false,player:{hand:[{uid:1,cost:2}],energy:2,fate:0}},{type:'play',uid:1}).ok,true));
test('seeded RNG reproducible',()=>{const a=core.seededRandom(123),b=core.seededRandom(123);for(let i=0;i<100;i++)assert.equal(a(),b())});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/);assert(js);new vm.Script(js[1]);console.log('PASS inline JS syntax');
assert(html.includes('battle-core.js'));console.log('PASS core loaded before game');
