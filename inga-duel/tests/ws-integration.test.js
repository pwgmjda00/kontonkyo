'use strict';
const assert=require('node:assert/strict');
const WebSocket=require('ws');
const {server}=require('../dev-server.js');
const deck=Array.from({length:12},(_,i)=>-(i+1));
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const sockets=[];
 async function api(route,body,token){
  const res=await fetch(base+'/api/'+route,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'content-type':'application/json'}),...(token?{authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  return res.json();
 }
 function connect(token){
  return new Promise((resolve,reject)=>{
   const ws=new WebSocket(base.replace('http:','ws:')+'/ws',{headers:{origin:base}});
   sockets.push(ws);
   const timer=setTimeout(()=>reject(Error('WebSocket timeout')),5000);
   ws.once('error',err=>{clearTimeout(timer);reject(err)});
   ws.once('open',()=>{ws.send(JSON.stringify({type:'hello',token}));clearTimeout(timer);resolve(ws)});
  });
 }
 function receive(ws,predicate=()=>true){
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{ws.off('message',handler);reject(Error('message timeout'))},5000);
   function handler(raw){const m=JSON.parse(raw.toString());if(predicate(m)){clearTimeout(timer);ws.off('message',handler);resolve(m)}}
   ws.on('message',handler);
  });
 }
 try{
  const host=await api('create',{code:'せかいのおわりに',deck});assert.equal(host.ok,true);
  const a=await connect(host.token);const waiting=await receive(a,m=>m.type==='state');assert.equal(waiting.status,'waiting');
  const aStarted=receive(a,m=>m.type==='state'&&m.status==='playing');
  const guest=await api('join',{code:host.code,deck});assert.equal(guest.ok,true);
  const start=await aStarted;assert.equal(start.revision,0);assert.equal(start.view.opponent.hand,undefined);
  const b=await connect(guest.token);const guestState=await receive(b,m=>m.type==='state');assert.equal(guestState.view.opponent.hand,undefined);
  const nextA=receive(a,m=>m.type==='state'&&m.revision===1),nextB=receive(b,m=>m.type==='state'&&m.revision===1);
  a.send(JSON.stringify({type:'action',revision:0,action:{type:'end_turn'}}));
  assert.equal((await nextA).revision,1);assert.equal((await nextB).revision,1);
  const rejected=receive(b,m=>m.type==='rejected');
  b.send(JSON.stringify({type:'action',revision:0,action:{type:'end_turn'}}));
  assert.equal((await rejected).reason,'stale_revision');
  a.close();await new Promise(resolve=>a.once('close',resolve));
  const reconnect=await connect(host.token);const synced=await receive(reconnect,m=>m.type==='state');
  assert.equal(synced.revision,1);assert.equal(synced.seat,0);
  console.log('PASS actual WebSocket: connect, join, broadcast, private hand, stale action, reconnect');
 }finally{
  for(const ws of sockets)ws.terminate();
  await new Promise(resolve=>server.close(resolve));
 }
}
run().catch(err=>{console.error(err);process.exitCode=1});
