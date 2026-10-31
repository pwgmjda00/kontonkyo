// Release gate: real browser, not just vitest/jsdom. No external user data.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const capture=path.join(root,'release-screenshots');
fs.mkdirSync(capture,{recursive:true});
const entries=JSON.parse(fs.readFileSync(path.join(root,'data/verified_machine_events.json'),'utf8'));
const tokyo=entries.find(e=>e.machine.includes('東京リベンジャーズ'))||entries[0];
const mockIssue={
  number:12345,title:'[ドパ殿堂応募] テスト',state:'open',
  html_url:'https://github.com/pwgmjda00/kontonkyo/issues/12345',
  created_at:new Date().toISOString(),labels:[],
  body:[
    '### 公開ニックネーム','','公開テストさん','','### 好きなモード','','🎭 どっちも','',
    '### 飾りたい称号','','最初の一撃','','### ひと言','','ドパッと公開できた！','',
    '### 同意','','- [X] このニックネーム・称号・ひと言を公開サイトに掲載してよい'
  ].join('\n')
};
let server;
function startServer(){
  server=spawn('npm',['run','preview','--','--host','127.0.0.1','--port','4175','--strictPort'],{
    cwd:root,stdio:['ignore','pipe','pipe'],detached:true,
  });
  return new Promise((resolve,reject)=>{
    let out='';
    const timer=setTimeout(()=>reject(new Error('Preview did not start: '+out)),25000);
    const log=b=>{out+=String(b);if(out.includes('http://127.0.0.1:')&&out.includes('4175')){clearTimeout(timer);resolve();}};
    server.stdout.on('data',log);server.stderr.on('data',log);
    server.on('error',reject);
    server.on('exit',n=>{if(n!==0)reject(new Error('Preview stopped: '+out));});
  });
}
async function main(){
  await startServer();
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  let passes=0;
  try{
    for(const viewport of [{width:390,height:844},{width:320,height:720}]){
      const context=await browser.newContext({
        viewport,locale:'ja-JP',isMobile:true,hasTouch:true,deviceScaleFactor:3,
        reducedMotion:'reduce',acceptDownloads:true
      });
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('https://api.github.com/repos/pwgmjda00/kontonkyo/issues?**',route=>
        route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([mockIssue,{
          ...mockIssue,number:12346,html_url:'https://github.com/pwgmjda00/kontonkyo/issues/12346',
          labels:[{name:'dopa-hall-hide'}],body:mockIssue.body.replace('公開テストさん','非表示テストさん')
        }])}));
      await page.addInitScript(id=>{
        localStorage.setItem('dopa-collector-rewards-v1',JSON.stringify({
          version:1,counts:{[id]:2},rounds:3,dryRounds:1,fails:1,
          bestStreak:5,featuredId:id,equippedBadge:'first',alias:'ドパテスター',
        }));
      },tokyo.id);
      const response=await page.goto('http://127.0.0.1:4175/',{waitUntil:'networkidle'});
      assert.equal(response?.status(),200,'App loads');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal scroll at '+viewport.width);
      const push=page.getByTestId('machine-push');
      assert.equal(await push.isVisible(),true,'PUSH visible');
      const bounding=await push.boundingBox();
      assert.ok(bounding&&bounding.y+bounding.height<viewport.height-6,
        'PUSH above fold '+viewport.width+': '+JSON.stringify(bounding));
      await page.screenshot({path:path.join(capture,'iphone-'+viewport.width+'-ready.png')});
      const rewards=page.getByTestId('rewards-open');
      await rewards.click();
      assert.equal(await page.locator('.dopa-sticker-card.tier-2').count()>0,true,'Saved 2nd hit evolves sticker');
      await page.screenshot({path:path.join(capture,'iphone-'+viewport.width+'-collector.png')});
      const [download]=await Promise.all([
        page.waitForEvent('download',{timeout:20000}),
        page.locator('.dopa-sticker-card.tier-2').first().getByRole('button',{name:/画像にする/}).click(),
      ]);
      assert.ok(download.suggestedFilename().endsWith('.png'),'PNG save should work');
      await page.getByRole('button',{name:'🏅 称号',exact:true}).click();
      assert.ok(await page.locator('.dopa-badge.is-earned').count()>0,'Badges load');
      await page.getByRole('button',{name:/殿堂・企画/}).click();
      await page.getByText('公開テストさん').waitFor({timeout:10000});
      assert.equal(await page.getByText('非表示テストさん').count(),0,'Hidden entries excluded');
      assert.ok(await page.getByRole('button',{name:/最新に更新/}).count(),'Manual refresh is available');
      await page.screenshot({path:path.join(capture,'iphone-'+viewport.width+'-hall.png')});
      assert.deepEqual(errors,[],'No uncaught runtime errors');
      await context.close();
      console.log('PASS iPhone viewport '+viewport.width+'x'+viewport.height+' / PNG / live hall / badges');
      passes++;
    }
  }finally{await browser.close();}
  console.log('PASS '+passes+' mobile release smoke suites');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{
  if(server){
    try{process.kill(-server.pid,'SIGTERM');}
    catch{server.kill('SIGTERM');}
    server.stdout?.destroy();
    server.stderr?.destroy();
  }
  // npm preview launches a child Vite process, and inherited stdio pipes can
  // keep Node alive after tests complete. A full process-tree kill avoids CI hangs.
});
