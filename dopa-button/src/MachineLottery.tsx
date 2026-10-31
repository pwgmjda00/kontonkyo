import { useEffect, useMemo, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import { MACHINE_EVENTS, drawEveryMachine, judgeContact, machineRoundStatistics, type MachineHit } from './machineLottery';
import { machineTrivia } from './machineTrivia';
import { machineEmojiPack, firstTimeMachineHits } from './machineEmoji';
import { MachineCelebration } from './MachineCelebration';
import { RewardsHub } from './RewardsHub';
import { loadRewards, saveRewards, winRewards, failRewards, newEarnedBadges, type RewardProfile } from './machineRewards';
import { DEFAULT_WALLET_SETTINGS, emptyVirtualWallet, validateVirtualWallet, applyVirtualRound, walletYen, theoreticalReturnPct, validateWalletSettings, slotNormalReturnPerSpin, type VirtualKind, type VirtualWallet, type WalletSettings, type WalletRound } from './machineWallet';

type Phase = 'ready' | 'countdown' | 'round' | 'result' | 'celebrate' | 'paused' | 'over';
type Prompt = 'go' | 'stop';
interface MachineState { phase: Phase; prompt: Prompt; score: number; remaining: number; duration: number; count: number; lastHits: MachineHit[]; token: number; }
const INIT: MachineState = {phase:'ready',prompt:'go',score:0,remaining:1500,duration:1500,count:3,lastHits:[],token:0};
const BEST_KEY='dopa-machine-reflex-best-v1';
const UNLOCK_KEY='dopa-machine-emoji-discoveries-v1';
const PACHINKO_EVENTS=MACHINE_EVENTS.filter(x=>x.kind==='pachinko');
const PACHISLOT_EVENTS=MACHINE_EVENTS.filter(x=>x.kind==='pachislot');
const MODE_EVENTS={pachinko:PACHINKO_EVENTS,pachislot:PACHISLOT_EVENTS};
const ROUND_STATS={pachinko:machineRoundStatistics(PACHINKO_EVENTS),pachislot:machineRoundStatistics(PACHISLOT_EVENTS)};
const WALLET_KEY='dopa-virtual-balls-medals-v1';
const SETTINGS_KEY='dopa-virtual-money-settings-v1';
type TwoWallets=Record<VirtualKind,VirtualWallet>;
function loadWallets():TwoWallets{
  try{
    const v=JSON.parse(localStorage.getItem(WALLET_KEY)||'{}') as Partial<TwoWallets>;
    return {pachinko:validateVirtualWallet(v.pachinko),pachislot:validateVirtualWallet(v.pachislot)};
  }catch{return {pachinko:emptyVirtualWallet(),pachislot:emptyVirtualWallet()};}
}
function loadSettings():WalletSettings{
  try{return validateWalletSettings({...DEFAULT_WALLET_SETTINGS,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')});}
  catch{return {...DEFAULT_WALLET_SETTINGS};}
}
const numberDisplay=new Intl.NumberFormat('ja-JP',{maximumFractionDigits:0});
const fmt=(n:number)=>numberDisplay.format(Math.round(n));
const signed=(n:number)=>n<0?'−'+fmt(-n):'+'+fmt(n);
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
  const [rewards,setRewards]=useState<RewardProfile>(loadRewards);
  const rewardsRef=useRef(rewards);
  const [latestBadges,setLatestBadges]=useState<string[]>([]);
  const [best,setBest]=useState(readBest);
  const [kind,setKind]=useState<VirtualKind>('pachinko');
  const kindRef=useRef<VirtualKind>('pachinko');
  const [settings,setSettings]=useState<WalletSettings>(loadSettings);
  const settingsRef=useRef<WalletSettings>(settings);
  const [wallets,setWallets]=useState<TwoWallets>(loadWallets);
  const walletsRef=useRef<TwoWallets>(wallets);
  const [lastRound,setLastRound]=useState<WalletRound|null>(null);
  const [confirmReset,setConfirmReset]=useState(false);
  const [hitHistory,setHitHistory]=useState<MachineHit[]>([]);
  const [loadedUnlocks]=useState(loadUnlocks);
  const discovered=useRef(new Set([...loadedUnlocks,...Object.keys(rewards.counts)]));
  const [unlockCount,setUnlockCount]=useState(discovered.current.size);
  const [newWins,setNewWins]=useState<MachineHit[]>([]);
  const [celebrateIndex,setCelebrateIndex]=useState(0);
  const [showAllHistory,setShowAllHistory]=useState(false);
  const [filter,setFilter]=useState<'all'|'pachinko'|'pachislot'>('all');
  const [query,setQuery]=useState('');
  const [shownCount,setShownCount]=useState(()=>window.matchMedia('(max-width:540px)').matches?10:30);
  const live=useRef(INIT);
  const deadline=useRef(0);
  const keyboardHeld=useRef(false);
  useEffect(()=>{try{localStorage.setItem(WALLET_KEY,JSON.stringify(wallets));}catch{/* private browsing */}},[wallets]);
  useEffect(()=>{saveRewards(rewards);},[rewards]);
  const setRewardProfile=(next:RewardProfile)=>{rewardsRef.current=next;setRewards(next);};
  useEffect(()=>{try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{/* private browsing */}},[settings]);
  const publish=(patch:Partial<MachineState>)=>{const next={...live.current,...patch};live.current=next;setState(next);};
  const phase=(next:Phase,patch:Partial<MachineState>={})=>publish({...patch,phase:next,token:live.current.token+1});
  const finish=()=>{const score=live.current.score;
    const before=rewardsRef.current;
    const after=failRewards(before,score);
    setRewardProfile(after);
    setLatestBadges(newEarnedBadges(before,after).map(b=>b.emoji+b.name));
    setBest(old=>{const next=Math.max(old,score);try{localStorage.setItem(BEST_KEY,String(next));}catch{/* storage disabled */}return next;});phase('over',{remaining:0});};
  const nextRound=(now:number)=>{
    const duration=Math.max(700,1500-live.current.score*25);
    deadline.current=now+duration;
    phase('round',{prompt:fairPrompt(),duration,remaining:duration,count:0});
  };
  const success=(now:number)=>{
    if(live.current.phase!=='round')return;
    const active=kindRef.current;
    const events=MODE_EVENTS[active];
    const results=drawEveryMachine(events);
    const hits=results.filter(r=>r.hit);
    const played=applyVirtualRound(walletsRef.current[active],active,events,hits,settingsRef.current);
    const both={...walletsRef.current,[active]:played.wallet};
    walletsRef.current=both;
    setWallets(both);
    setLastRound(played);
    const score=live.current.score+1;
    const beforeRewards=rewardsRef.current;
    const afterRewards={...winRewards(beforeRewards,hits),bestStreak:Math.max(beforeRewards.bestStreak,score)};
    setRewardProfile(afterRewards);
    setLatestBadges(newEarnedBadges(beforeRewards,afterRewards).map(b=>b.emoji+b.name));
    if(hits.length) setHitHistory(old=>[...hits,...old].slice(0,40));
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
  const switchMoney=(next:VirtualKind)=>{
    if(!['ready','over'].includes(live.current.phase))return;
    if(next===kindRef.current)return;
    kindRef.current=next;
    setKind(next);
    setHitHistory([]);
    setLastRound(null);
    setNewWins([]);
    setShowAllHistory(false);
    setConfirmReset(false);
    phase('ready',{score:0,remaining:1500,lastHits:[]});
  };
  const changeSetting=(field:keyof WalletSettings,value:number)=>{
    if(!['ready','over'].includes(live.current.phase))return;
    const next={...settingsRef.current,[field]:value};
    try{validateWalletSettings(next);}catch{return;}
    settingsRef.current=next;
    setSettings(next);
  };
  const resetWallet=()=>{
    if(!['ready','over'].includes(live.current.phase))return;
    if(!confirmReset){setConfirmReset(true);return;}
    const both={...walletsRef.current,[kindRef.current]:emptyVirtualWallet()};
    walletsRef.current=both;
    setWallets(both);
    setLastRound(null);
    setConfirmReset(false);
  };
  const start=(now:number)=>{
    deadline.current=now+900;
    setHitHistory([]);
    setShowAllHistory(false);
    setLatestBadges([]);
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
  const wallet=wallets[kind];
  const money=walletYen(wallet,kind);
  const units=kind==='pachinko'?'玉':'枚';
  const activeCount=MODE_EVENTS[kind].length;
  const activeStats=ROUND_STATS[kind];
  const canSwitch=state.phase==='ready'||state.phase==='over';
  return <section className="real-machine-panel machine-reflex" aria-label="実機一斉抽選・反射ゲーム">
    <div className="real-machine-head"><span>REAL MACHINES × REFLEX</span><span>REAL MACHINE MODE</span></div>
    <p className="machine-hero-kicker">MAIN GAME · 押すな。でも押せ。</p>
    <button type="button" className="machine-legacy-link" onClick={onClose} disabled={!['ready','over'].includes(state.phase)}>↗ 通常・ドパ・ゲーミングドパでも遊ぶ</button>
    <h2>収録実機、一斉抽選。</h2>
    <div className="machine-money-tabs" role="group" aria-label="玉とメダルを切り替える">
      <button type="button" disabled={!canSwitch} aria-pressed={kind==='pachinko'} onClick={()=>switchMoney('pachinko')}>🟠 パチンコ <small>玉</small></button>
      <button type="button" disabled={!canSwitch} aria-pressed={kind==='pachislot'} onClick={()=>switchMoney('pachislot')}>🪙 パチスロ <small>メダル</small></button>
    </div>
    <p className="machine-hero-copy">「押せ！」はタップ、「押すな！」は待つ。成功で<strong>{activeCount}条件を一斉抽選</strong>。玉とメダルは別会計。</p>
    <div className="real-machine-stats"><span>SCORE <strong data-testid="machine-score">{state.score}</strong></span><span>BEST <strong>{best}</strong></span><span>NEW <strong data-testid="machine-unlocks">{unlockCount}<small>/{MACHINE_EVENTS.length}</small></strong></span></div>
    <div className="machine-instruction" data-testid="machine-instruction" data-prompt={state.prompt} data-phase={state.phase}>{instruction}</div>
    <div className="machine-countdown-track"><span style={{transform:`scaleX(${state.phase==='round'?Math.max(0,state.remaining/state.duration):1})`}} /></div>
    <div className="machine-result-slot">{state.phase==='result'&&<div className="machine-result-flash" role="status">
      <strong>{result.length?'🎰 当選 '+result.length+'件':'✓ SUCCESS'}</strong>
      {lastRound&&<small className="machine-cash-result">投入 {fmt(lastRound.wagerUnits)}{units} ｜ 仮想払出 {fmt(lastRound.payoutUnits)}{units}</small>}
      {result.length>0&&<><span className="machine-flash-emojis" aria-hidden="true">{machineEmojiPack(result[0].event).icons.slice(0,5).join(' ')}</span><span>{result[0].event.machine}{result.length>1?' ほか '+(result.length-1)+'件':''}</span><small className="machine-hit-fact">{machineEmojiPack(result[0].event).chant}</small></>}
    </div>}</div>
    <button className="real-machine-push" type="button" disabled={!canPush} data-testid="machine-push" onPointerDown={onPointerDown} onKeyDown={onKeyboardDown} onKeyUp={e=>{if(e.key===' '||e.key==='Enter')keyboardHeld.current=false;}} onBlur={()=>{keyboardHeld.current=false;}} onClick={e=>{if(e.detail===0&&!keyboardHeld.current)activate();}} aria-label={state.phase==='round'?(state.prompt==='stop'?'押すな。何も触らず待つ':'押せ。ボタンに触れる'):(state.phase==='ready'?'ゲームを開始':'ゲームをもう一度開始')}><small>{state.phase==='ready'?'TAP TO START':state.phase==='over'?'TRY AGAIN':kind==='pachinko'?'BALL DRAW':'MEDAL DRAW'}</small><strong>PUSH</strong><span>{state.phase==='round'&&state.prompt==='stop'?'触ったら終了':'一瞬で運命が変わる'}</span></button>
    {latestBadges.length>0&&(state.phase==='result'||state.phase==='over')&&<p className="dopa-badge-toast" role="status">🏅 称号GET！ {latestBadges.join(' · ')}</p>}
    <section className="machine-wallet" aria-label={kind==='pachinko'?'仮想持ち玉・収支':'仮想持ちメダル・収支'} data-testid="machine-wallet">
      <div className="machine-wallet-top">
        <div className="machine-wallet-net"><span>💰 仮想収支</span><strong data-testid="machine-wallet-profit" className={money.profit>=0?'wallet-positive':'wallet-negative'}>{signed(money.profit)}円</strong><small>差{units} {signed(money.netUnits)}{units}</small></div>
        <div className="machine-wallet-carry"><span>{kind==='pachinko'?'🟠 持ち玉':'🪙 持ちメダル'}</span><strong data-testid="machine-wallet-balance">{fmt(money.balanceUnits)} <small>{units}</small></strong><small>仮想1,000円ずつ自動貸出</small></div>
      </div>
      <div className="machine-wallet-metrics">
        <div><span>💸 仮想投資額</span><strong data-testid="machine-wallet-invested">{fmt(money.investment)}円</strong></div>
        <div><span>💵 仮想回収額</span><strong data-testid="machine-wallet-recovered">{fmt(money.recovered)}円</strong></div>
        <div><span>🎲 総抽選数</span><strong data-testid="machine-wallet-spins">{fmt(wallet.spins)}回</strong></div>
        <div><span>🎁 当選時の平均払出</span><strong data-testid="machine-wallet-average">{fmt(money.averagePayout)}{units}</strong></div>
      </div>
      <p className="machine-wallet-note"><strong>現金・PayPayへの交換はできません。</strong> 模擬レート <b>{kind==='pachinko'?'4円/玉':'20円/枚'}</b>。成功1回＝選択中の{activeCount}台が各1回転。投資と払出も{activeCount}台分を合算。累計{fmt(wallet.rounds)}ラウンド、{fmt(wallet.wins)}件当選。</p>
      <details className="machine-wallet-config">
        <summary>⚙️ ボーダーと仮想出玉の計算・設定</summary>
        {kind==='pachinko'?<div className="wallet-fields">
          <label>仮定のボーダー（1,000円あたり）<input type="number" min={10} max={30} step={0.5} value={settings.pachinkoBorder} disabled={!canSwitch} onChange={e=>changeSetting('pachinkoBorder',Number(e.target.value))}/>回転</label>
          <label>実際の回転率の仮定（1,000円あたり）<input type="number" min={10} max={30} step={0.5} value={settings.pachinkoSpins} disabled={!canSwitch} onChange={e=>changeSetting('pachinkoSpins',Number(e.target.value))}/>回転</label>
          <p>1回転の玉消費＝250÷回転率。当選時の仮想払出＝（250÷ボーダー）÷機種の掲載確率。理論収支率は<strong>{theoreticalReturnPct(kind,settings).toFixed(1)}%</strong>。</p>
        </div>:<div className="wallet-fields">
          <label>仮定の機械割<input type="number" min={80} max={120} step={0.5} value={settings.slotReturnPct} disabled={!canSwitch} onChange={e=>changeSetting('slotReturnPct',Number(e.target.value))}/>%</label>
          <label>仮想ベース（50枚あたり）<input type="number" min={20} max={55} step={1} value={settings.slotGamesPer50} disabled={!canSwitch} onChange={e=>changeSetting('slotGamesPer50',Number(e.target.value))}/>G</label>
          <p>1Gにつき3枚BET、小役の仮想平均戻しは<strong>{slotNormalReturnPerSpin(settings).toFixed(2)}枚</strong>。残りを当選時の仮想払出に割り当て、想定機械割<strong>{theoreticalReturnPct(kind,settings).toFixed(1)}%</strong>になる計算。</p>
        </div>}
        <p className="wallet-warning">⚠️ 実機ごとのボーダー・実出玉・連チャン・RUSH・設定差を再現した数値ではありません。掲載された当たり確率を使う架空の会計です。設定変更は今後の抽選だけに反映します。換金できず、現実の勝ち負けも予測しません。</p>
        <div className="wallet-reset"><button type="button" disabled={!canSwitch} onClick={resetWallet}>{confirmReset?'本当にこの会計をリセット':'この会計をリセット'}</button>{confirmReset&&<button type="button" onClick={()=>setConfirmReset(false)}>キャンセル</button>}</div>
      </details>
    </section>
    <RewardsHub profile={rewards} onUpdate={next=>{if(canSwitch)setRewardProfile(next);}} disabled={!canSwitch}/>
    {state.phase==='over'&&<p className="machine-gameover">失敗。反射スコア {state.score} 。PUSHでもう一度。</p>}
    {(state.phase==='over'||state.phase==='ready')&&<section className="real-machine-result" aria-live="polite">
      <h3>{hitHistory.length?'🎰 今回のプレイで当選した実機 '+hitHistory.length+'件':result.length?'🎰 今回の実機当選 '+result.length+'件':state.score?'今回の実機当選なし':'成功したら実機を一斉抽選'}</h3>
      {hitHistory.slice(0,showAllHistory?40:5).map((hit,index)=><article className="machine-emoji-card" key={hit.event.id+'-'+index}><div className="machine-emoji-line" aria-hidden="true">{machineEmojiPack(hit.event).icons.slice(0,6).join(' ')}</div><strong>{hit.event.machine}</strong><span>{hit.event.kind==='pachislot'?'パチスロ':'パチンコ'} · {hit.event.publishedProbability}</span><p className="machine-emoji-chant">{machineEmojiPack(hit.event).chant}</p><details className="machine-trivia-details" open={index===0}><summary>もっとこの台を知る</summary><p>{machineTrivia(hit.event).theme}</p><p>{machineTrivia(hit.event).odds}</p><p>{machineTrivia(hit.event).context}</p></details></article>)}
      {hitHistory.length>5&&<button className="machine-more" type="button" onClick={()=>setShowAllHistory(value=>!value)}>{showAllHistory?'当選履歴を5件に戻す':`ほか ${hitHistory.length-5} 件の当選履歴も見る ↓`}</button>}
    </section>}
    <p className="machine-hall-note">気になる台を見つけた？ <a href="https://www.p-world.co.jp/" target="_blank" rel="noopener noreferrer">P-WORLDでホールや設置機種を探す ↗</a></p>
    <p className="real-machine-warning">これは模擬抽選のゲームです。実際のホールでの当選や収支を予測するものではありません。</p>
    <details className="machine-odds-disclosure"><summary>🎲 なぜこんなに当たるの？ 抽選の仕組み</summary><p>成功するたびに選択中の{activeCount}条件を<span>それぞれ1回ずつ独立抽選</span>しています。1回の成功で1件以上当たる理論確率は<b>{(activeStats.atLeastOne*100).toFixed(1)}%</b>、平均当選数は<b>{activeStats.expectedHits.toFixed(2)}件</b>。単独の機種の確率を甘くする仕組みはなく、初獲得・絵文字演出でも当選率は変わりません。</p></details>
    <details className="machine-catalog-expand"><summary>📚 実機図鑑・豆知識を見る <span>{MACHINE_EVENTS.length}条件</span></summary>
    <div className="machine-catalog-top"><h3>実機データ図鑑 <span>{MACHINE_EVENTS.length}条件</span></h3><p className="machine-catalog-summary">人気シリーズを先頭に表示。エヴァ、北斗、海物語、ジャグラー、スマスロなど。</p><p>お気に入りの作品の意外な見どころを発見。全機種に「面白ポイント」つき！</p><label>機種名検索 <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="機種・メーカーで検索"/></label><div className="machine-filters">{(['all','pachinko','pachislot'] as const).map(value=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value==='all'?'全部':value==='pachinko'?'パチンコ':'パチスロ'}</button>)}</div></div>
    <div className="real-machine-list machine-emoji-grid">{filtered.slice(0,shownCount).map(v=><article className="machine-emoji-card" key={v.id}><div className="machine-emoji-line" aria-hidden="true">{machineEmojiPack(v).icons.slice(0,6).join(' ')}</div><div><strong>{v.machine}</strong><span>{v.maker==='未確認'||v.maker==='未照合'||v.maker==='要確認'||v.maker==='機種ページ参照'?(v.kind==='pachislot'?'パチスロ':'パチンコ'):v.maker+' · '+(v.kind==='pachislot'?'パチスロ':'パチンコ')}</span></div><div><b>{v.publishedProbability}</b><small>累計当選 {rewards.counts[v.id]??0}回</small></div><p className="machine-emoji-chant">{machineEmojiPack(v).chant}</p><details className="machine-trivia-details"><summary>作品の話と確率の面白さをもっと読む</summary><p>{machineTrivia(v).theme}</p><p>{machineTrivia(v).odds}</p><p>{machineTrivia(v).context}</p></details></article>)}</div>{shownCount<filtered.length&&<button className="machine-more" type="button" onClick={()=>setShownCount(n=>n+(window.matchMedia('(max-width:540px)').matches?10:30))}>さらに機種を表示 ↓</button>}
    </details>
    {state.phase==='celebrate'&&newWins.length>0&&<MachineCelebration hits={newWins} index={celebrateIndex} profile={rewards} earnedTitles={latestBadges} onNext={nextNewWin} onSkip={resumeAfterNewWins}/>}
  </section>;
}
