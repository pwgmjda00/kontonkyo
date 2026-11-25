import test from 'node:test';import assert from 'node:assert/strict';import {fixture,select,advance} from '../engine/simulation.mjs';import {commit,load,KEY,offlineMs} from '../engine/save.mjs';
const store=()=>{let m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
test('mastery unlocks repeat after eight uses',()=>{let s=fixture();for(let i=0;i<8;i++){select(s,'rest');advance(s,2000)}assert.equal(s.levels.rest,5);select(s,'rest',true)});
test('material unlocks work',()=>{let s=fixture();for(let i=0;i<4;i++){select(s,'chop');advance(s,4000)}assert.ok(s.unlocked.includes('work'))});
test('save roundtrip, revision conflict and backup recovery',()=>{let st=store(),s=fixture();let a=commit(st,s,0,100);assert.deepEqual(load(st).envelope,a);commit(st,s,1,200);assert.throws(()=>commit(st,s,1,300));st.setItem(KEY,'broken');assert.equal(load(st).recovered,true);assert.equal(load(st).envelope.revision,1)});
test('offline bounds',()=>{assert.equal(offlineMs(100,0),0);assert.equal(offlineMs(0,999999999),86400000)});
