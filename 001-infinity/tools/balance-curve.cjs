#!/usr/bin/env node
'use strict';
// Deterministic snapshots, not a claim about real player retention or session length.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const source=fs.readFileSync(process.env.INFINITY_HTML||path.resolve(__dirname,'../index.html'),'utf8');
 const start=source.indexOf("(()=>{'use strict';const fmtKinds"),end=source.indexOf('</script>',start),close=source.lastIndexOf('})();',end);
 if(start<0||close<start)throw Error('Game closure missing');
 const bridge=`const balanceBaseline=JSON.stringify(s);window.__curve=p=>{
 Object.assign(s,JSON.parse(balanceBaseline));s.lv=p.level;s.n=0;s.wins=p.stage-1;s.bosses={};s.pendingBossReward=0;s.owned={};s.disabled={};s.cards={};s.choices={};s.choiceArchive={};s.shop={mondrian:1};s.rebirth=0;s.forgeLevel={};s.research={opening:0,recycling:0,balance:0};s.boostUntil=0;s.chaosUntil=0;s.returnBonusUntil=0;s.v81Hunt.enabled=false;s.autoOpen=false;
 for(const id in s.v76Buildings.levels)s.v76Buildings.levels[id]=p.town||0;
 if(p.copies)for(let id=0;id<107;id++)s.owned[id]=p.copies;
 if(p.gods)for(let id=107;id<118;id++)s.owned[id]=1;
 if(p.rare)for(const kind of ['gear','card','trophy'])for(let id=0;id<100;id++)v82Grant(kind,id);
 if(p.ascendant!==undefined&&typeof v84Grant==='function')v84Grant(p.ascendant);
 const combat=v74CombatStats(),production=income(),price=lvCost();fight=null;startFight();
 const foe={hp:fight.e.hp,attack:fight.e.atk,boss:fight.e.boss};let turns=0;
 while(fight.active&&turns<300){fightTick(fight.last+1000);turns++;}
 return {...p,upgradeSeconds:price/production,buildingNext:v76BuildingCost('dojo'),combat,foe,turns,outcome:fight.active?'timeout':fight.hp>0?'win':'loss'};
 };`;
 const html=source.slice(0,close)+bridge+source.slice(close);
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html;charset=utf-8');r.end(html);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage();await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.addInitScript(()=>{Math.random=()=>.5;Date.now=()=>1762128000000;});
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
 const profiles=[{level:1,stage:1},{level:5,stage:5},{level:10,stage:11},{level:25,stage:26,copies:1},{level:50,stage:51,copies:10,town:10},{level:178,stage:178,copies:100},{level:178,stage:178,copies:100,town:100},{level:178,stage:178,copies:100,gods:true},{level:300,stage:301,copies:100,town:100},{level:300,stage:301,copies:100,town:100,gods:true,rare:true},{level:500,stage:500,copies:100},{level:300,stage:301,copies:100,town:100,ascendant:0},{level:500,stage:500,copies:100,ascendant:11},{level:500,stage:500,copies:100,ascendant:21},{level:500,stage:1000,copies:100},{level:500,stage:1000,copies:100,ascendant:11},{level:500,stage:1000,copies:100,ascendant:21}];
 const rows=[];for(const p of profiles)rows.push(await page.evaluate(p=>__curve(p),p));
 console.log(JSON.stringify(rows,null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
