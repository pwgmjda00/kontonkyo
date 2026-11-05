// Run: node --test fifty-two-preview/tests/gin-rummy.test.cjs
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','gin-rummy.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source,'embedded game script exists');new Function(source);
const nodes=new Map();
function el(id){if(!nodes.has(id))nodes.set(id,{id,value:id==='personality'?'balanced':'normal',disabled:false,hidden:false,textContent:'',className:'',open:true,replaceChildren(){},setAttribute(){},onclick:null});return nodes.get(id)}
const store=new Map(),sandbox={document:{getElementById:el,createElement:()=>({textContent:'',className:'',disabled:false,setAttribute(){}})},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},confirm:()=>true,Math,Set,Map,JSON,Number,Array,console};
const injected=source.replace(/\}\)\(\);\s*$/, 'globalThis.GIN_TEST={analyze,layoff,deck,points:pts,options,valid,draw,discard,getState:()=>s,start,resetHand:startHand};})();');
vm.runInNewContext(injected,sandbox,{timeout:1500});
const g=sandbox.GIN_TEST,c=(si,r)=>({si,r});
test('deck is 52 unique cards',()=>{const d=g.deck();assert.equal(d.length,52);assert.equal(new Set(d.map(x=>x.si*13+x.r)).size,52)});
test('set and run both reduce deadwood',()=>{const a=g.analyze([c(0,1),c(1,1),c(2,1),c(3,5)]);assert.equal(a.dead,5);const b=g.analyze([c(0,5),c(0,6),c(0,7),c(2,13)]);assert.equal(b.dead,10)});
test('overlapping melds cannot reuse a card',()=>{const a=g.analyze([c(0,5),c(0,6),c(0,7),c(1,6),c(2,6)]);assert.equal(a.dead,12)});
test('layoff extends a run at both ends',()=>{const k=g.analyze([c(0,5),c(0,6),c(0,7)]);assert.equal(g.layoff(k,[c(0,4),c(0,8),c(2,13)]),10)});
test('layoff can extend a set to four cards',()=>{const k=g.analyze([c(0,9),c(1,9),c(2,9)]);assert.equal(g.layoff(k,[c(3,9),c(1,2)]),2)});
test('opponent melds and layoff are both counted',()=>{const k=g.analyze([c(0,5),c(0,6),c(0,7)]);assert.equal(g.layoff(k,[c(0,8),c(1,2),c(2,2),c(3,2),c(1,13)]),10)});
test('saved state has a valid full deck',()=>{assert.equal(g.valid(g.getState()),true)});
test('draw discard preserves 52 unique cards',()=>{g.draw('stock');const s=g.getState();assert.equal(s.me.length,11);s.selected=0;g.discard(false);const n=g.getState();assert.equal(n.me.length,10);assert.equal(n.cpu.length,10);assert.equal(n.me.length+n.cpu.length+n.pile.length+n.stock.length,52);assert.equal(new Set([...n.me,...n.cpu,...n.pile,...n.stock].map(x=>x.si*13+x.r)).size,52)});

test('decision coach records a legal discard and best deadwood benchmark',()=>{
 const state=g.getState();
 if(state.phase!=='draw')return;
 g.draw('stock');
 const current=g.getState();
 const before=current.decisions.length;
 current.selected=0;
 g.discard(false);
 assert.equal(current.decisions.length,before+1);
 const last=current.decisions.at(-1);
 assert.ok(last.dead>=last.bestDead);
 assert.ok(Array.isArray(last.best));
 assert.ok(last.best.length>0);
});

test('pile pickup stays save-valid even when discard pile is temporarily empty',()=>{
 g.start();const s=g.getState();assert.equal(s.pile.length,1);
 g.draw('pile');assert.equal(s.phase,'discard');assert.equal(s.pile.length,0);assert.equal(g.valid(s),true);
 const forbidden=s.pileTaken;const choice=g.options(s.me,s.me.findIndex(c=>c.si*13+c.r-1===forbidden))[0];s.selected=choice.i;g.discard(false);assert.equal(g.valid(s),true);
});
test('repeated automated hands preserve card and save invariants',()=>{
 for(let round=0;round<12;round++){
   g.start();const s=g.getState();
   for(let turn=0;turn<45;turn++){
     if(s.phase==='match'||s.phase==='between')break;
     if(s.phase==='draw')g.draw('stock');
     if(s.phase==='discard'){
       const candidates=g.options(s.me,-1).sort((a,b)=>a.dead-b.dead);
       s.selected=candidates[0].i;g.discard(candidates[0].dead<=5);
     }
     assert.equal(g.valid(s),true,'invalid state in round '+round+', turn '+turn);
   }
 }
});
