/* Local development HTTP server. Run: node inga-duel/dev-server.js
   Serves static UI + authoritative lobby API. NOT for public deployment.
   No WebSocket yet: clients use short polling. */
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const base=__dirname,context={};vm.createContext(context);
for(const file of ['battle-core.js','battle-rules.js','duel-engine.js','match-journal.js','room-core.js','lobby-core.js','cards.js'])
 vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),context,{filename:file});
const lobby=context.IngaLobby.createLobby({catalog:[...context.cards,...context.starter],randomBytes:n=>crypto.randomBytes(n),ttlMs:60*60*1000});
const port=Number(process.env.PORT||8788);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
function reply(res,status,obj){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(obj))}
function auth(req){const header=req.headers.authorization||'';return /^Bearer [a-f0-9]{64}$/.test(header)?header.slice(7):''}
async function body(req){let data='';for await(const chunk of req){data+=chunk;if(data.length>8192)throw Error('too_large')}return JSON.parse(data||'{}')}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){
   if(req.method==='POST'){
    const data=await body(req),token=auth(req);
    let result;
    if(url.pathname==='/api/create')result=lobby.create(data.deck,data.code);
    else if(url.pathname==='/api/join')result=lobby.join(data.code,data.deck);
    else if(url.pathname==='/api/action')result=lobby.action(token,data.revision,data.action);
    else if(url.pathname==='/api/close')result=lobby.close(token);
    else return reply(res,404,{ok:false,reason:'not_found'});
    return reply(res,result.ok?200:400,result);
   }
   if(req.method==='GET'&&url.pathname==='/api/status'){const result=lobby.status(auth(req));return reply(res,result.ok?200:401,result)}
   return reply(res,405,{ok:false,reason:'method_not_allowed'});
  }
  if(req.method!=='GET')return reply(res,405,{ok:false,reason:'method_not_allowed'});
  const name=url.pathname==='/'?'online-duel.html':url.pathname.slice(1);
  if(!/^[a-z0-9-]+\.(html|js|css)$/.test(name))return reply(res,404,{ok:false,reason:'not_found'});
  const file=path.join(base,name);
  fs.readFile(file,(err,bytes)=>{if(err)return reply(res,404,{ok:false,reason:'not_found'});res.writeHead(200,{'content-type':types[path.extname(name)],'x-content-type-options':'nosniff','cache-control':'no-store'});res.end(bytes)});
 }catch(e){reply(res,400,{ok:false,reason:e.message==='too_large'?'too_large':'invalid_request'})}
});
if(require.main===module)server.listen(port,'127.0.0.1',()=>console.log('Local duel: http://127.0.0.1:'+port));
module.exports={server};
