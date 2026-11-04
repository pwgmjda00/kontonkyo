const assert=require('node:assert/strict');
const {server}=require('../dev-server.js');
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 async function req(route,body,token){
  const res=await fetch(base+'/api/'+route,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'content-type':'application/json'}),...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  return res.json();
 }
 const deck=Array.from({length:12},(_,i)=>-(i+1));
 try{
  const host=await req('create',{code:'せかいのおわりに',deck});assert.equal(host.ok,true);
  const waiting=await req('status',undefined,host.token);assert.equal(waiting.status,'waiting');
  const guest=await req('join',{code:host.code,deck});assert.equal(guest.ok,true);
  const a=await req('status',undefined,host.token),b=await req('status',undefined,guest.token);
  assert.equal(a.view.opponent.hand,undefined);assert.equal(b.view.opponent.hand,undefined);
  const turn=await req('action',{revision:0,action:{type:'end_turn'}},host.token);assert.equal(turn.ok,true);
  const stale=await req('action',{revision:0,action:{type:'end_turn'}},guest.token);assert.equal(stale.reason,'stale_revision');
  const unauthorized=await req('status');assert.equal(unauthorized.reason,'unauthorized');
  console.log('PASS HTTP create/join/wait/hidden-hand/action/stale/auth');
 }finally{await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
