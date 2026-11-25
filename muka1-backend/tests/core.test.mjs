import test from 'node:test';
import assert from 'node:assert/strict';
import {parseIds,validVotes} from '../../muka1-preview/core.js';
import {PHRASE_MAP} from '../../muka1-preview/catalog.js';
test('all 128 tournament paths and invalid winner paths',()=>{
 const ids=[0,1,2,3,1000255,1000256,1000257,1000258];
 for(let path=0;path<128;path++){
  let queue=ids.slice(),next=[],choices=[];
  for(let i=0;i<7;i++){
   const id=queue[(path>>i)&1];choices.push(id);next.push(id);queue.splice(0,2);
   if(!queue.length){queue=next;next=[];}
  }
  assert(validVotes(choices,ids));
  for(let i=0;i<7;i++){const invalid=choices.slice();invalid[i]=1000510;assert(!validVotes(invalid,ids));}
 }
 assert(!validVotes([0,2,4,6,0,4,0],[0,1,2,3]));
});
test('stable ID URL parsing rejects malformed and unknown parameters',()=>{
 assert.deepEqual(parseIds('0,1000510',2,PHRASE_MAP),[0,1000510]);
 for(const value of ['','0,','0,1,2','0,0','0,-1','0,1.0','0,1e2','0,NaN','0,Infinity','0,9007199254740993','0,256'])assert.equal(parseIds(value,2,PHRASE_MAP),null,value);
 const withApproved=new Map(PHRASE_MAP);withApproved.set(256,'架空の承認文');
 assert.deepEqual(parseIds('256,1000255',2,withApproved),[256,1000255]);
});
