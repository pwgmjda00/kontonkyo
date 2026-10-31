import { useEffect, useRef, useState } from 'react';
import { MACHINE_EVENTS, drawEveryMachine, isUltraRare, type MachineHit } from './machineLottery';

type Phase = 'ready' | 'countdown' | 'round' | 'result' | 'paused' | 'over';
type Prompt = 'go' | 'stop';
interface MachineState { phase: Phase; prompt: Prompt; score: number; remaining: number; duration: number; count: number; lastHits: MachineHit[]; token: number; }
const INIT: MachineState = {phase:'ready',prompt:'go',score:0,remaining:1500,duration:1500,count:3,lastHits:[],token:0};
const BEST_KEY='dopa-machine-reflex-best-v1';
function readBest(){try{return Math.max(0,Number(localStorage.getItem(BEST_KEY))||0);}catch{return 0;}}
function fairPrompt():Prompt{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]!%2===0?'go':'stop';}

export function MachineLottery({onClose}:{onClose:()=>void}) {
  const [state,setState]=useState<MachineState>(INIT);
  const [best,setBest]=useState(readBest);
  const [totals,setTotals]=useState<Record<string,number>>({});
  const [hitHistory,setHitHistory]=useState<MachineHit[]>([]);
  const [filter,setFilter]=useState<'all'|'pachinko'|'pachislot'>('all');
  const [query,setQuery]=useState('');
  const [rareOnly,setRareOnly]=useState(false);
  const [shownCount,setShownCount]=useState(30);
  const live=useRef(INIT);
  const deadline=useRef(0);
  const keyboardHeld=useRef(false);
  const publish=(patch:Partial<MachineState>)=>{const next={...live.current,...patch};live.current=next;setState(next);};
  const phase=(next:Phase,patch:Partial<MachineState>={})=>publish({...patch,phase:next,token:live.current.token+1});
  const finish=()=>{const score=live.current.score;setBest(old=>{const next=Math.max(old,score);try{localStorage.setItem(BEST_KEY,String(next));}catch{/* storage disabled */}return next;});phase('over',{remaining:0});};
  const nextRound=(now:number)=>{
    const duration=Math.max(700,1500-live.current.score*25);
    deadline.current=now+duration;
    phase('round',{prompt:fairPrompt(),duration,remaining:duration,count:0});
  };
  const success=(now:number)=>{
    if(live.current.phase!=='round')return;
    const results=drawEveryMachine();
    const hits=results.filter(r=>r.hit);
    const score=live.current.score+1;
    if(hits.length) setHitHistory(old=>[...hits,...old].slice(0,40));
    setTotals(prev=>{const next={...prev};for(const hit of hits)next[hit.event.id]=(next[hit.event.id]??0)+1;return next;});
    // Most wins are a brief pulse. Rare wins earn a readable moment, but never a long forced wait.
    const duration=hits.some(hit=>isUltraRare(hit.event))?1450:hits.length?420:180;
    deadline.current=now+duration;
    phase('result',{score,lastHits:hits,remaining:duration});
  };
  const start=(now:number)=>{
    deadline.current=now+900;
    setHitHistory([]);
    phase('countdown',{score:0,remaining:900,count:3,lastHits:[]});
  };
  // Physical input is decided on pointer DOWN, not delayed until finger release.
  // A held finger must never bypass STOP or miss a timely GO.
  const activate=(now=performance.now())=>{
    const current=live.current;
    if(current.phase==='ready'||current.phase==='over')start(now);
    else if(current.phase==='round') {
      if(now>=deadline.current){
        // A late contact cannot turn a completed STOP into a user press.
        if(current.prompt==='stop')success(deadline.current);
        else finish();
      } else if(current.prompt==='go')success(now);
      else finish();
    }
  };
  const onPointerDown=(event:React.PointerEvent<HTMLButtonElement>)=>{
    if(event.button!==0 || !event.isPrimary)return;
    activate(performance.now());
  };
  const onKeyboardDown=(event:React.KeyboardEvent<HTMLButtonElement>)=>{
    if(event.key!==' '&&event.key!=='Enter')return;
    event.preventDefault();
    if(keyboardHeld.current||event.repeat)return;
    keyboardHeld.current=true;
    activate(performance.now());
  };
  useEffect(()=>{
    let raf=0;
    const tick=(now:number)=>{
      const s=live.current;
      if(s.phase==='round'||s.phase==='countdown'||s.phase==='result'){
        const remaining=Math.max(0,deadline.current-now);
        if(remaining>0){
          const count=s.phase==='countdown'?Math.ceil(remaining/300):s.count;
          if(Math.abs(s.remaining-remaining)>20||count!==s.count)publish({remaining,count});
        }else if(s.phase==='countdown')nextRound(now);
        else if(s.phase==='round'){if(s.prompt==='stop')success(now);else finish();}
        else nextRound(now);
      }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    const visibility=()=>{
      const s=live.current;
      if(document.hidden && (s.phase==='round'||s.phase==='result'||s.phase==='countdown')){
        phase('paused');
      }else if(!document.hidden && live.current.phase==='paused'){
        deadline.current=performance.now()+900;
        phase('countdown',{remaining:900,count:3});
        // Resume with a fresh prompt, avoiding a lost deadline.
      }
    };
    document.addEventListener('visibilitychange',visibility);
    return()=>{cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);};
  },[]);
  const popularKeywords=['エヴァンゲリオン','北斗の拳','東京喰種','海物語','リゼロ','Re:ゼロ','モンキーターン','ジャグラー','からくりサーカス','ゴッドイーター','カバネリ','ヴァルヴレイヴ','マギアレコード','モンスターハンター','炎炎ノ消防隊','戦国乙女','沖ドキ','ルパン三世','牙狼','吉宗'];
  const popularIndex=(name:string)=>{const n=name.normalize('NFKC').toLocaleLowerCase('ja');const i=popularKeywords.findIndex(x=>n.includes(x.normalize('NFKC').toLocaleLowerCase('ja')));return i<0?999:i;};
  const filtered=MACHINE_EVENTS.filter(x=>(filter==='all'||x.kind===filter)&&(!rareOnly||isUltraRare(x))&&(!query||[x.machine,x.maker,x.category].join(' ').toLocaleLowerCase('ja').includes(query.toLocaleLowerCase('ja')))).sort((a,b)=>popularIndex(a.machine)-popularIndex(b.machine)||a.machine.localeCompare(b.machine,'ja'));
  const canPush=state.phase==='ready'||state.phase==='over'||state.phase==='round';
  const instruction=state.phase==='round'?(state.prompt==='go'?'押せ！':'押すな！'):state.phase==='countdown'?String(state.count):state.phase==='over'?'GAME OVER':state.phase==='ready'?'READY?':state.phase==='paused'?'PAUSED':'GOOD!';
  const result=state.lastHits;
  const ultraRareHits=result.filter(hit=>isUltraRare(hit.event));
  const rareHistory=hitHistory.filter(hit=>isUltraRare(hit.event));
  const ultraRareCatalog=MACHINE_EVENTS.filter(isUltraRare);
  return <section className="real-machine-panel machine-reflex" aria-label="実機一斉抽選・反射ゲーム">
    <div className="real-machine-head"><span>REAL MACHINES × REFLEX</span><button type="button" onClick={onClose} disabled={!['ready','over'].includes(state.phase)}>旧3モードへ ↗</button></div>
    <p className="machine-hero-kicker">MAIN GAME · 押すな。でも押せ。</p>
    <h2>収録実機、一斉抽選。</h2>
    <p className="machine-hero-copy">「押せ！」なら押す。「押すな！」なら待つ。成功した瞬間、収録した<strong>{MACHINE_EVENTS.length}条件</strong>をまとめて抽選。</p>
    <div className="real-machine-stats"><span>SCORE <strong data-testid="machine-score">{state.score}</strong></span><span>BEST <strong>{best}</strong></span><span>TIME <strong>{state.phase==='round'?(state.remaining/1000).toFixed(2):'—'}</strong></span></div>
    <div className="machine-instruction" data-testid="machine-instruction" data-prompt={state.prompt} data-phase={state.phase}>{instruction}</div>
    <div className="machine-countdown-track"><span style={{transform:`scaleX(${state.phase==='round'?Math.max(0,state.remaining/state.duration):1})`}} /></div>
    <div className="machine-result-slot">{state.phase==='result'&&<div className={ultraRareHits.length?'machine-result-flash is-rare':'machine-result-flash'} role="status">
      <strong>{ultraRareHits.length?'✦ 1/666突破！':result.length?'🎰 当選 '+result.length+'件':'✓ SUCCESS'}</strong>
      {result.length>0&&<span>{result.slice(0,2).map(h=>h.event.machine).join(' ／ ')}{result.length>2?' ほか':''}</span>}
      {ultraRareHits.length>0&&<button type="button" onClick={()=>nextRound(performance.now())}>演出を飛ばして続ける →</button>}
    </div>}</div>
    <button className="real-machine-push" type="button" disabled={!canPush} data-testid="machine-push" onPointerDown={onPointerDown} onKeyDown={onKeyboardDown} onKeyUp={e=>{if(e.key===' '||e.key==='Enter')keyboardHeld.current=false;}} onBlur={()=>{keyboardHeld.current=false;}} onClick={e=>{if(e.detail===0&&!keyboardHeld.current)activate();}}><small>{state.phase==='ready'?'TAP TO START':state.phase==='over'?'TRY AGAIN':'ALL MACHINE DRAW'}</small><strong>PUSH</strong><span>{state.phase==='round'&&state.prompt==='stop'?'触ったら終了':'一瞬で運命が変わる'}</span></button>
    {state.phase==='over'&&<p className="machine-gameover">失敗。反射スコア {state.score} 。PUSHでもう一度。</p>}
    {rareHistory.length>0&&state.phase==='over'&&<section className="machine-rare-spotlight" aria-label="666分の1を超える超希少な当選"><span>666 BREAK / 超希少当選</span><h3>1/666より重い確率を引いた！</h3><p>ゲームで引けた奇跡。実機での当たりを保証するものではないけど、実機が気になったら、ホールの設置情報を探してみよう。</p>{rareHistory.slice(0,5).map((hit,i)=><p key={hit.event.id+'-'+i}><strong>{hit.event.machine}</strong> · {hit.event.publishedProbability}</p>)}<a href="https://www.p-world.co.jp/" target="_blank" rel="noopener noreferrer" className="machine-hall-link">設置ホールを探す ↗</a></section>}
    {(state.phase==='over'||state.phase==='ready')&&<section className="real-machine-result" aria-live="polite">
      <h3>{hitHistory.length?'🎰 今回のプレイで当選した実機 '+hitHistory.length+'件':result.length?'🎰 今回の実機当選 '+result.length+'件':state.score?'今回の実機当選なし':'成功したら実機を一斉抽選'}</h3>
      {hitHistory.slice(0,12).map(hit=><article key={hit.event.id}><strong>{hit.event.machine}{isUltraRare(hit.event)?' ✦ 1/666突破':''}</strong><span>{hit.event.category} · {hit.event.publishedProbability}</span><p>{hit.event.condition}</p><a href={hit.event.sourceUrl} target="_blank" rel="noopener noreferrer">データ出典 ↗</a></article>)}
      {hitHistory.length>12&&<p>ほか {hitHistory.length-12} 件。直近40件を保持しています。</p>}
    </section>}
    <p className="machine-hall-note">気になる台を見つけた？ <a href="https://www.p-world.co.jp/" target="_blank" rel="noopener noreferrer">P-WORLDでホールや設置機種を探す ↗</a></p>
    <p className="real-machine-warning">模擬確率ゲームです。実機の抽選結果や未来の収支は予測しません。データは公式と二次情報を含み、設定・状態・合算の違いがあります。すべての設置機種を網羅したものではありません。</p>
    <div className="machine-catalog-top"><h3>実機データ図鑑 <span>{MACHINE_EVENTS.length}条件</span></h3><p className="machine-catalog-summary">人気シリーズを先頭に表示。エヴァ、北斗、海物語、ジャグラー、スマスロなど。</p><p>✦ 1/666より重い超希少イベント：{ultraRareCatalog.length}件。機種のスペックや演出を眺めて、次にホールで見てみたい台を探そう。</p><label>機種名検索 <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="機種・メーカーで検索"/></label><div className="machine-filters">{(['all','pachinko','pachislot'] as const).map(value=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value==='all'?'全部':value==='pachinko'?'パチンコ':'パチスロ'}</button>)}</div><label className="machine-rare-toggle"><input type="checkbox" checked={rareOnly} onChange={e=>{setRareOnly(e.target.checked);setShownCount(30);}}/> ✦ 1/666より重い確率だけ見る</label></div>
    <div className="real-machine-list">{filtered.slice(0,shownCount).map(v=><article key={v.id}><div><strong>{v.machine}{isUltraRare(v)?' ✦ 超希少':''}</strong><span>{v.maker} · {v.category}</span></div><div><b>{v.publishedProbability}</b><small>この端末での当選 {totals[v.id]??0}回</small></div><p>{v.condition}</p><a href={v.sourceUrl} target="_blank" rel="noopener noreferrer">確率データの出典 ↗</a></article>)}</div>{shownCount<filtered.length&&<button className="machine-more" type="button" onClick={()=>setShownCount(n=>n+30)}>あと {Math.min(30,filtered.length-shownCount)} 機種を表示 ↓</button>}
  </section>;
}
