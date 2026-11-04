/* WebSocket room transport. Server-side adapter; no deployment or global room registry.
   Socket contract: send(string), close(), addEventListener(type, handler).
   Authentication happens in hello; tokens must only travel over TLS in production. */
(function(root){
'use strict';
function createSocketHub(room,options={}){
 if(!room||typeof room.snapshot!=='function'||typeof room.submit!=='function')throw Error('Room required');
 const clients=new Map();
 const maxMessageBytes=options.maxMessageBytes||4096;
 function send(ws,obj){try{ws.send(JSON.stringify(obj))}catch(_e){disconnect(ws)}}
 function disconnect(ws){clients.delete(ws)}
 function broadcast(){
  for(const [ws,entry] of clients){
   const state=room.snapshot(entry.token);
   if(!state.ok){send(ws,{type:'error',reason:'unauthorized'});disconnect(ws);continue}
   send(ws,{type:'state',revision:state.revision,seat:state.seat,view:state.view});
  }
 }
 function attach(ws){
  if(!ws||typeof ws.send!=='function'||typeof ws.addEventListener!=='function')throw Error('Invalid socket');
  let closed=false;
  function close(){closed=true;disconnect(ws)}
  ws.addEventListener('close',close);
  ws.addEventListener('error',close);
  ws.addEventListener('message',event=>{
   if(closed)return;
   const raw=event&&event.data;
   if(typeof raw!=='string'||raw.length>maxMessageBytes){send(ws,{type:'error',reason:'invalid_message'});return}
   let msg;
   try{msg=JSON.parse(raw)}catch(_e){send(ws,{type:'error',reason:'invalid_json'});return}
   if(!msg||typeof msg!=='object'||Array.isArray(msg)){send(ws,{type:'error',reason:'invalid_message'});return}
   if(msg.type==='hello'){
    if(clients.has(ws)){send(ws,{type:'error',reason:'already_authenticated'});return}
    const state=room.reconnect(msg.token,msg.revision);
    if(!state.ok){send(ws,{type:'error',reason:'unauthorized'});return}
    clients.set(ws,{token:msg.token});
    send(ws,{type:'welcome',revision:state.revision,seat:state.seat,changed:state.changed,view:state.view});
    return;
   }
   const client=clients.get(ws);
   if(!client){send(ws,{type:'error',reason:'unauthorized'});return}
   if(msg.type==='sync'){
    const state=room.reconnect(client.token,msg.revision);
    send(ws,{type:'state',revision:state.revision,seat:state.seat,changed:state.changed,view:state.view});
   }else if(msg.type==='action'){
    const result=room.submit(client.token,msg.revision,msg.action);
    if(!result.ok){send(ws,{type:'rejected',reason:result.reason,revision:result.revision});return}
    broadcast();
   }else send(ws,{type:'error',reason:'unknown_type'});
  });
  return {disconnect:close};
 }
 return Object.freeze({attach,connected:()=>clients.size,disconnect});
}
root.IngaSocketHub=Object.freeze({createSocketHub});
})(typeof globalThis!=='undefined'?globalThis:this);
