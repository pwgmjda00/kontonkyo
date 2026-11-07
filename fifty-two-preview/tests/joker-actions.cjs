'use strict';
const assert=require('node:assert/strict');
const j=require('../engine/jokers.js');
const a=require('../engine/joker-actions.js');
const m=require('../engine/joker-score-mode.js');
let checks=0;function test(name,fn){fn();checks++;console.log('✓ '+name)}
test('all 77 JOKERs retain unique definitions and deterministic daily offer',()=>{
 assert.equal(j.catalog.length,77);
 assert.equal(new Set(j.catalog.map(x=>x.id)).size,77);
 assert.deepEqual(j.daily('2026-12-02'),j.daily('2026-12-02'));
});
test('action adapter supports exactly its named effects',()=>{
 const supported=j.catalog.filter(a.supports);
 assert.deepEqual(supported.map(x=>x.id),['J22','J24','J26','J30','J50','J51','J64','J68']);
 assert.ok(supported.every(x=>a.describe(x)));
 assert.equal(a.describe(j.get('J01')),'');
});
test('rank mutation is pure and clamps between ace and king',()=>{
 const c={r:13,si:0},low={r:1,si:1};
 assert.deepEqual(a.effectiveCard(j.get('J50'),c),c);
 assert.deepEqual(a.effectiveCard(j.get('J51'),low),low);
 assert.deepEqual(a.effectiveCard(j.get('J50'),{r:12,si:0}),{r:13,si:0});
 assert.deepEqual(a.effectiveCard(j.get('J51'),{r:2,si:2}),{r:1,si:2});
 assert.deepEqual(c,{r:13,si:0});
 assert.equal(a.effectiveCard(null,c),c);
});
test('revealed next cards and suit totals cannot mutate the deck',()=>{
 const deck=[{r:2,si:0},{r:8,si:1},{r:11,si:1},{r:4,si:3}];
 const copy=a.peek(j.get('J22'),deck);
 assert.deepEqual(copy,deck);assert.notEqual(copy,deck);
 assert.deepEqual(a.peek(j.get('J24'),deck),[]);
 assert.deepEqual(a.suitCounts(j.get('J24'),deck),[1,2,0,1]);
 assert.equal(a.suitCounts(j.get('J22'),deck),null);
 assert.deepEqual(deck,[{r:2,si:0},{r:8,si:1},{r:11,si:1},{r:4,si:3}]);
});
test('HIGH/LOW hints use remaining cards not fixed guess',()=>{
 const current={r:8,si:0},deck=[{r:13,si:1},{r:12,si:0},{r:3,si:0},{r:8,si:2}];
 assert.deepEqual(a.highLowHint(j.get('J26'),current,deck),{higher:2,lower:1,tie:1,choice:'HIGH'});
 assert.equal(a.highLowHint(j.get('J22'),current,deck),null);
});
test('COUNTDOWN hint avoids illegal negative values',()=>{
 const c=[{r:7,si:0},{r:2,si:1},{r:1,si:2}];
 assert.deepEqual(a.countdownHint(j.get('J26'),4,c),{index:1,sign:-1,after:2,rank:2});
 assert.equal(a.countdownHint(j.get('J22'),4,c),null);
 assert.equal(a.countdownHint(j.get('J26'),0,[]),null);
});
test('rescue ability works once and never extends to unrelated effects',()=>{
 for(const id of ['J30','J64','J68']){assert.equal(a.canRescue(j.get(id),false),true);assert.equal(a.canRescue(j.get(id),true),false)}
 assert.equal(a.canRescue(j.get('J22'),false),false);
 assert.equal(a.canRescue(null,false),false);
});
test('normal score stays unchanged; JOKER score is a separate result',()=>{
 const base=31,ctx={round:10,totalRounds:10,final:true,win:true};
 assert.deepEqual(m.compute('normal',j.get('J01'),base,ctx),{score:base,delta:0,description:'通常スコア'});
 assert.deepEqual(m.compute('joker',null,base,ctx),{score:base,delta:0,description:'通常スコア'});
 const extra=m.compute('joker',j.get('J01'),base,ctx);assert.equal(extra.score,base+7);assert.equal(extra.delta,7);
});
console.log('JOKER action unit tests PASS '+checks);
