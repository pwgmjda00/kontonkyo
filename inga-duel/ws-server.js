/* WebSocket adapter for the authoritative invite lobby.
   Requires npm install ws. Tokens are sent only in hello, not URL query strings. */
'use strict';
const {WebSocketServer}=require('ws');
function attachWebSocket(server,lobby){
 const wss=new WebSocketServer({noServer:true,maxPayload:4096});
 server.on('upgrade',(req,socket,head)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname!=='/ws'||req.headers.origin&&req.headers.origin!==('http://'+req.headers.host)){
   socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;
  }
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
 });
 wss.on('connection',ws=>{
  let token=null,unsubscribe=null;
  const send=obj=>{if(ws.readyState===ws.OPEN)ws.send(JSON.stringify(obj))};
  const update=()=>{
   if(!token)return;
   const result=lobby.status(token);
   if(!result.ok){send({type:'error',reason:'room_closed'});ws.close(1008);return}
   send({type:'state',...result});
  };
  ws.on('message',raw=>{
   let msg;
   try{msg=JSON.parse(raw.toString())}catch(_){send({type:'error',reason:'invalid_json'});return}
   if(!msg||typeof msg!=='object'||Array.isArray(msg))return send({type:'error',reason:'invalid_message'});
   if(msg.type==='hello'){
    if(token)return send({type:'error',reason:'already_authenticated'});
    if(typeof msg.token!=='string'||!/^[a-f0-9]{64}$/.test(msg.token))return send({type:'error',reason:'unauthorized'});
    const subscription=lobby.subscribe(msg.token,update);
    if(!subscription.ok)return send({type:'error',reason:'unauthorized'});
    token=msg.token;unsubscribe=subscription.unsubscribe;update();return;
   }
   if(!token)return send({type:'error',reason:'unauthorized'});
   if(msg.type==='sync')return update();
   if(msg.type==='action'){
    const result=lobby.action(token,msg.revision,msg.action);
    if(!result.ok)send({type:'rejected',reason:result.reason,revision:result.revision});
    return;
   }
   send({type:'error',reason:'unknown_type'});
  });
  ws.on('close',()=>{if(unsubscribe)unsubscribe()});
  ws.on('error',()=>{if(unsubscribe)unsubscribe()});
 });
 return wss;
}
module.exports={attachWebSocket};
