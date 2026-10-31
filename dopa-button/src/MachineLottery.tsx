import { useEffect, useMemo, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import { MACHINE_EVENTS, drawEveryMachine, judgeContact, type MachineHit } from './machineLottery';
import { machineTrivia } from './machineTrivia';
import { machineEmojiPack, firstTimeMachineHits } from './machineEmoji';
import { MachineCelebration } from './MachineCelebration';

type Phase = 'ready' | 'countdown' | 'round' | 'result' | 'celebrate' | 'paused' | 'over';
type Prompt = 'go' | 'stop';
interface MachineState { phase: Phase; prompt: Prompt; score: number; remaining: number; duration: number; count: number; lastHits: MachineHit[]; token: number; }
const INIT: MachineState = {phase:'ready',prompt:'go',score:0,remaining:1500,duration:1500,count:3,lastHits:[],token:0};
const BEST_KEY='dopa-machine-reflex-best-v1';
const UNLOCK_KEY='dopa-machine-emoji-discoveries-v1';
const catalogIds = new Set(MACHINE_EVENTS.map(item=>item.id));
function loadUnlocks(): Set<string> {
  try {
    const saved=JSON.parse(localStorage.getItem(UNLOCK_KEY)||'[]');
    return new Set(Array.isArray(saved)?saved.filter((id:unknown):id is string=>typeof id==='string'&&catalogIds.has(id)):[]);
  }catch{return new Set();}
}
function readBest(){try{return Math.max(0,Number(localStorage.getItem(BEST_KEY))||0);}catch{return 0;}}
function fairPrompt():Prompt{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]!%2===0?'go':'stop';}

export function MachineLottery({onClose}:{onClose:()=>void}) {
  const [state,setState]=useState<MachineState>(INIT);
  const [best,setBest]=useState(readBest);
  const [totals,setTotals]=useState<Record<string,number>>({});
  const [hitHistory,setHitHistory]=useState<MachineHit[]>([]);
  const [loadedUnlocks]=useState(loadUnlocks);
  const discovered=useRef(loadedUnlocks);
  const [unlockCount,setUnlockCount]=useState(loadedUnlocks.size);
  const [newWins,setNewWins]=useState<MachineHit[]>([]);
  const [celebrateIndex,setCelebrateIndex]=useState(0);
  const [showAllHistory,setShowAllHistory]=useState(false);
  const [filter,setFilter]=useState<'all'|'pachinko'|'pachislot'>('all');
  const [query,setQuery]=useState('');
  const [shownCount,setShownCount]=useState(()=>window.matchMedia('(max-width:540px)').matches?10:30);
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
    // New machine discoveries deserve a proper celebration, without running the clock.
    // Already-unlocked machines are just short flashes. Unlocks persist across sessions.
    const fresh=firstTimeMachineHits(hits,discovered.current);
    if(fresh.length){
      for(const hit of fresh)discovered.current.add(hit.event.id);
      setUnlockCount(discovered.current.size);
      try {localStorage.setItem(UNLOCK_KEY,JSON.stringify([...discovered.current]));}catch{/* private mode */}
      setNewWins(fresh);
      setCelebrateIndex(0);
      phase('celebrate',{score,lastHits:hits,remaining:0});
    }else{
      const duration=hits.length?650:180;
      deadline.current=now+duration;
      phase('result',{score,lastHits:hits,remaining:duration});
    }
  };
  const resumeAfterNewWins=()=>{
    setNewWins([]);
    setCelebrateIndex(0);
    deadline.current=performance.now()+900;
    phase('countdown',{remaining:900,count:3});
  };
  const nextNewWin=()=>{
    if(live.current.phase!=='celebrate')return;
    if(celebrateIndex+1<newWins.length)setCelebrateIndex(value=>value+1);
    else resumeAfterNewWins();
  };
  const start=(now:number)=>{
    deadline.current=now+900;
    setHitHistory([]);
    setShowAllHistory(false);
    phase('countdown',{score:0,remaining:900,count:3,lastHits:[]});
  };
  // Physical input is decided on pointer DOWN, not delayed until finger release.
  // A held finger must never bypass STOP or miss a timely GO.
  const activate=(now=performance.now())=>{
    const current=live.current;
    if(current.phase==='ready'||current.phase==='over')start(now);
    else if(current.phase==='round') {
      if(judgeContact(current.prompt,now,deadline.current)==='success')success(now);
      else finish();
    }
  };
  const onPointerDown=(event:PointerEvent<HTMLButtonElement>)=>{
    if(event.button!==0 || !event.isPrimary)return;
    activate(performance.now());
  };
  const onKeyboardDown=(event:KeyboardEvent<HTMLButtonElement>)=>{
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
  const filtered=useMemo(()=>MACHINE_EVENTS.filter(x=>(filter==='all'||x.kind===filter)&&(!query||[x.machine,x.maker,x.category].join(' ').toLocaleLowerCase('ja').includes(query.toLocaleLowerCase('ja')))).sort((a,b)=>popularIndex(a.machine)-popularIndex(b.machine)||a.machine.localeCompare(b.machine,'ja')),[filter,query]);
  const canPush=state.phase==='ready'||state.phase==='over'||state.phase==='round';
  const instruction=state.phase==='round'?(state.prompt==='go'?'押せ！':'押すな！'):state.phase==='countdown'?String(state.count):state.phase==='over'?'GAME OVER':state.phase==='ready'?'READY?':state.phase==='celebrate'?'🎉 NEW!':state.phase==='paused'?'PAUSED':'GOOD!';
  const result=state.lastHits;
  return <section className="real-machine-panel machine-reflex" aria-label="実機一斉抽選・反射ゲーム">
    <div className="real-machine-head"><span>REAL MACHINES × REFLEX</span><span>REAL MACHINE MODE</span></div>
    <p className="machine-hero-kicker">MAIN GAME · 押すな。でも押せ。</p>
    <button type="button" className="machine-legacy-link" onClick={onClose} disabled={!['ready','over'].includes(state.phase)}>↗ 通常・ドパ・ゲーミングドパでも遊ぶ</button>
    <h2>収録実機、一斉抽選。</h2>
    <p className="machine-hero-copy">「押せ！」はタップ、「押すな！」は待つ。成功で<strong>{MACHINE_EVENTS.length}機種一斉抽選</strong>。</p>
    <div className="real-machine-stats"><span>SCORE <strong data-testid="machine-score">{state.score}</strong></span><span>BEST <strong>{best}</strong></span><span>NEW <strong data-testid="machine-unlocks">{unlockCount}<small>/{MACHINE_EVENTS.length}</small></strong></span></div>
    <div className="machine-instruction" data-testid="machine-instruction" data-prompt={state.prompt} data-phase={state.phase}>{instruction}</div>
    <div className="machine-countdown-track"><span style={{transform:`scaleX(${state.phase==='round'?Math.max(0,state.remaining/state.duration):1})`}} /></div>
    <div className="machine-result-slot">{state.phase==='result'&&<div className="machine-result-flash" role="status">
      <strong>{result.length?'🎰 当選 '+result.length+'件':'✓ SUCCESS'}</strong>
      {result.length>0&&<><span className="machine-flash-emojis" aria-hidden="true">{machineEmojiPack(result[0].event).icons.slice(0,5).join(' ')}</span><span>{result[0].event.machine}{result.length>1?' ほか '+(result.length-1)+'件':''}</span><small className="machine-hit-fact">{machineEmojiPack(result[0].event).chant}</small></>}
    </div>}</div>
    <button className="real-machine-push" type="button" disabled={!canPush} data-testid="machine-push" onPointerDown={onPointerDown} onKeyDown={onKeyboardDown} onKeyUp={e=>{if(e.key===' '||e.key==='Enter')keyboardHeld.current=false;}} onBlur={()=>{keyboardHeld.current=false;}} onClick={e=>{if(e.detail===0&&!keyboardHeld.current)activate();}} aria-label={state.phase==='round'?(state.prompt==='stop'?'押すな。何も触らず待つ':'押せ。ボタンに触れる'):(state.phase==='ready'?'ゲームを開始':'ゲームをもう一度開始')}><small>{state.phase==='ready'?'TAP TO START':state.phase==='over'?'TRY AGAIN':'ALL MACHINE DRAW'}</small><strong>PUSH</strong><span>{state.phase==='round'&&state.prompt==='stop'?'触ったら終了':'一瞬で運命が変わる'}</span></button>
    {state.phase==='over'&&<p className="machine-gameover">失敗。反射スコア {state.score} 。PUSHでもう一度。</p>}
    {(state.phase==='over'||state.phase==='ready')&&<section className="real-machine-result" aria-live="polite">
      <h3>{hitHistory.length?'🎰 今回のプレイで当選した実機 '+hitHistory.length+'件':result.length?'🎰 今回の実機当選 '+result.length+'件':state.score?'今回の実機当選なし':'成功したら実機を一斉抽選'}</h3>
      {hitHistory.slice(0,showAllHistory?40:5).map((hit,index)=><article className="machine-emoji-card" key={hit.event.id+'-'+index}><div className="machine-emoji-line" aria-hidden="true">{machineEmojiPack(hit.event).icons.slice(0,6).join(' ')}</div><strong>{hit.event.machine}</strong><span>{hit.event.kind==='pachislot'?'パチスロ':'パチンコ'} · {hit.event.publishedProbability}</span><p className="machine-emoji-chant">{machineEmojiPack(hit.event).chant}</p><details className="machine-trivia-details" open={index===0}><summary>もっとこの台を知る</summary><p>{machineTrivia(hit.event).theme}</p><p>{machineTrivia(hit.event).odds}</p><p>{machineTrivia(hit.event).context}</p></details></article>)}
      {hitHistory.length>5&&<button className="machine-more" type="button" onClick={()=>setShowAllHistory(value=>!value)}>{showAllHistory?'当選履歴を5件に戻す':`ほか ${hitHistory.length-5} 件の当選履歴も見る ↓`}</button>}
    </section>}
    <p className="machine-hall-note">気になる台を見つけた？ <a href="https://www.p-world.co.jp/" target="_blank" rel="noopener noreferrer">P-WORLDでホールや設置機種を探す ↗</a></p>
    <p className="real-machine-warning">これは模擬抽選のゲームです。実際のホールでの当選や収支を予測するものではありません。</p>
    <details className="machine-catalog-expand"><summary>📚 実機図鑑・豆知識を見る <span>{MACHINE_EVENTS.length}条件</span></summary>
    <div className="machine-catalog-top"><h3>実機データ図鑑 <span>{MACHINE_EVENTS.length}条件</span></h3><p className="machine-catalog-summary">人気シリーズを先頭に表示。エヴァ、北斗、海物語、ジャグラー、スマスロなど。</p><p>お気に入りの作品の意外な見どころを発見。全機種に「面白ポイント」つき！</p><label>機種名検索 <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="機種・メーカーで検索"/></label><div className="machine-filters">{(['all','pachinko','pachislot'] as const).map(value=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value==='all'?'全部':value==='pachinko'?'パチンコ':'パチスロ'}</button>)}</div></div>
    <div className="real-machine-list machine-emoji-grid">{filtered.slice(0,shownCount).map(v=><article className="machine-emoji-card" key={v.id}><div className="machine-emoji-line" aria-hidden="true">{machineEmojiPack(v).icons.slice(0,6).join(' ')}</div><div><strong>{v.machine}</strong><span>{v.maker==='未確認'||v.maker==='未照合'||v.maker==='要確認'||v.maker==='機種ページ参照'?(v.kind==='pachislot'?'パチスロ':'パチンコ'):v.maker+' · '+(v.kind==='pachislot'?'パチスロ':'パチンコ')}</span></div><div><b>{v.publishedProbability}</b><small>この端末での当選 {totals[v.id]??0}回</small></div><p className="machine-emoji-chant">{machineEmojiPack(v).chant}</p><details className="machine-trivia-details"><summary>作品の話と確率の面白さをもっと読む</summary><p>{machineTrivia(v).theme}</p><p>{machineTrivia(v).odds}</p><p>{machineTrivia(v).context}</p></details></article>)}</div>{shownCount<filtered.length&&<button className="machine-more" type="button" onClick={()=>setShownCount(n=>n+(window.matchMedia('(max-width:540px)').matches?10:30))}>さらに機種を表示 ↓</button>}
    </details>
    {state.phase==='celebrate'&&newWins.length>0&&<MachineCelebration hits={newWins} index={celebrateIndex} onNext={nextNewWin} onSkip={resumeAfterNewWins}/>}
  </section>;
}
