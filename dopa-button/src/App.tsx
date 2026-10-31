import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { GameController, type GameState } from './game';
import { ProbabilityClient } from './worker-client';
import { type ProbabilityEvent } from './probability';
import { loadRecords, recordGameOver, recordPlay, recordSuccess, saveRecords, type Mode } from './records';
import { Encyclopedia } from './Encyclopedia';
import { MachineLottery } from './MachineLottery';
import { sound } from './sound';
import './app.css';

const MODES: { id: Mode; title: string; caption: string; icon: string }[] = [
  { id: 'normal', title: '通常', caption: '反射と、ほんとの確率。', icon: 'Ⅰ' },
  { id: 'dopa', title: 'ドパ', caption: '同じ確率。演出は多め。', icon: 'Ⅱ' },
  { id: 'gaming', title: 'ゲーミングドパ', caption: '激熱20% / 超激熱5%の演出。', icon: 'Ⅲ' },
];
const INITIAL: GameState = { phase: 'READY', mode: 'normal', score: 0, prompt: 'go', remainingMs: 1500, roundMs: 1500, countdown: 3, bonus: null, token: 0, error: null, lastDrawMs: 0 };
const STARS = Array.from({ length: 30 }, (_, i) => ({ '--x': `${(i * 47 + 11) % 100}%`, '--y': `${(i * 31 + 7) % 100}%`, '--delay': `${(i % 6) * .09}s`, '--r': `${(i * 79) % 360}deg` } as CSSProperties));
function compact(value: string) { return value.length > 35 ? `${value.slice(0, 12)}…${value.slice(-8)}（${value.length}桁）` : value.replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

export default function App() {
  const [game, setGame] = useState<GameState>(INITIAL);
  const [records, setRecords] = useState(loadRecords);
  const [muted, setMuted] = useState(true);
  const [lightReduced, setLightReduced] = useState(false);
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [library, setLibrary] = useState(false);
  const [machineLottery, setMachineLottery] = useState(() => {
    try { return sessionStorage.getItem('dopa-main-view') !== 'legacy'; }
    catch { return true; }
  });
  const [shareStatus, setShareStatus] = useState('');
  const [copyText, setCopyText] = useState('');
  const controller = useRef<GameController | null>(null);
  const inputToken = useRef<number | null>(null);
  const push = useRef<HTMLButtonElement>(null);
  const libraryRef = useRef(false);
  const libraryOrigin = useRef<GameState['phase']>('READY');
  const bonusDialog = useRef<HTMLDialogElement>(null);
  const lastPhase = useRef<GameState['phase']>('READY');
  const lastScore = useRef(0);
  const countSeen = useRef(0);
  const initialized = useRef(false);

  useEffect(() => {
    const client = new ProbabilityClient();
    const engine = new GameController({
      roll: client.roll,
      rollGaming: client.gaming,
      onPlay: mode => { setRecords(previous => recordPlay(previous, mode)); setShareStatus(''); setCopyText(''); },
      onSuccess: outcome => setRecords(previous => recordSuccess(previous, outcome)),
      onGameOver: outcome => setRecords(previous => recordGameOver(previous, outcome.mode, outcome.score)),
    });
    controller.current = engine;
    initialized.current = true;
    setGame(engine.state);
    const unsubscribe = engine.subscribe(() => setGame(engine.state));
    let frame = 0;
    const tick = (time: number) => { engine.tick(time); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    const visibility = () => {
      inputToken.current = null;
      if (document.hidden) { engine.pause(); sound.suspend(); }
      else if (!libraryRef.current) engine.resume();
    };
    document.addEventListener('visibilitychange', visibility);
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setSystemReduced(media.matches);
    media.addEventListener('change', motion);
    return () => {
      initialized.current = false;
      cancelAnimationFrame(frame);
      unsubscribe(); engine.destroy(); client.destroy();
      if (controller.current === engine) controller.current = null;
      document.removeEventListener('visibilitychange', visibility);
      media.removeEventListener('change', motion);
      sound.suspend();
    };
  }, []);
  useEffect(() => { saveRecords(records); }, [records]);
  useEffect(() => { window.scrollTo({top:0,behavior:'instant'}); }, [machineLottery]);
  useEffect(() => { controller.current?.setEffectsEnabled(effectsEnabled); }, [effectsEnabled]);
  useEffect(() => {
    sound.setPlaying(['ROUND', 'GAP', 'DRAWING'].includes(game.phase));
    if (game.phase === 'COUNTDOWN' && game.countdown !== countSeen.current) { countSeen.current = game.countdown; sound.cue('count'); }
    if (game.score > lastScore.current) sound.cue(game.mode === 'gaming' ? 'gaming' : 'success');
    if (game.phase === 'GAME_OVER' && lastPhase.current !== 'GAME_OVER') sound.cue('failure');
    if (game.phase === 'BONUS' && lastPhase.current !== 'BONUS' && game.bonus) {
      sound.setPlaying(false);
      if (game.bonus.theme === 'freeze') sound.hush();
      else sound.cue(game.bonus.theme);
    }
    if (['READY', 'GAME_OVER'].includes(game.phase) && !libraryRef.current) push.current?.focus({ preventScroll: true });
    lastScore.current = game.score; lastPhase.current = game.phase;
  }, [game.phase, game.score, game.countdown, game.mode, game.bonus]);
  useEffect(() => {
    const dialog = bonusDialog.current;
    if (!dialog) return;
    if (game.phase === 'BONUS' && !dialog.open) dialog.showModal();
    if (game.phase !== 'BONUS' && dialog.open) dialog.close();
    if (game.phase === 'BONUS' && game.bonus?.theme === 'freeze') {
      const timer = setTimeout(() => { if (controller.current?.state.phase === 'BONUS') sound.cue('bonus'); }, 2700);
      return () => clearTimeout(timer);
    }
  }, [game.phase, game.bonus]);

  const gentle = lightReduced || systemReduced;
  const canChangeMode = game.phase === 'READY' || game.phase === 'GAME_OVER';
  const best = records.best[game.mode === 'gaming' ? 'gaming' : 'shared'];
  const discovered = Object.keys(records.discoveries).length;
  const playing = game.phase === 'ROUND';
  const canPush = playing || canChangeMode;
  const mode = MODES.find(item => item.id === game.mode)!;
  const instruction = playing ? (game.prompt === 'go' ? '押せ！' : '押すな！') : game.phase === 'COUNTDOWN' ? String(game.countdown) : game.phase === 'GAME_OVER' ? 'GAME OVER' : game.phase === 'READY' ? 'READY?' : game.phase === 'PAUSED' ? 'PAUSED' : game.phase === 'BONUS' ? 'BONUS' : 'GOOD!';
  const currentBonus = game.bonus;
  const bonusEvent = currentBonus?.event;
  const bonusKind = currentBonus?.kind;
  const bonusTitle = bonusKind === 'casual' ? (currentBonus?.tier === 'super' ? '超激熱' : '激熱') : currentBonus?.theme === 'freeze' ? 'FREEZE' : currentBonus?.theme === 'numbers' ? '確率崩壊' : '宇宙終焉';
  const bonusLabel = bonusKind === 'actual' ? '実当選 / 図鑑に記録済み' : bonusKind === 'preview' ? 'プレビュー / 実当選ではありません' : bonusKind === 'casual' ? 'カジュアル演出 / 実当選ではありません' : '確率シアター / 演出のみ・実当選ではありません';
  const remaining = playing ? `${(game.remainingMs / 1000).toFixed(2)}` : game.phase === 'READY' ? '1.50' : '—';

  function pressPush(event: MouseEvent<HTMLButtonElement>) {
    const engine = controller.current;
    if (!engine) return;
    if (event.detail > 0 && inputToken.current === null) return;
    const token = inputToken.current ?? engine.getInputToken();
    inputToken.current = null;
    void sound.unlock(); engine.press(undefined, token);
  }
  function openLibrary() {
    const engine = controller.current;
    if (!engine) return;
    libraryOrigin.current = engine.state.phase;
    libraryRef.current = true;
    engine.pause(); sound.suspend(); setLibrary(true);
  }
  function closeLibrary() {
    libraryRef.current = false; setLibrary(false);
    if (!document.hidden) { void sound.unlock(); controller.current?.resume(); }
  }
  function preview(event: ProbabilityEvent) { controller.current?.preview(event); void sound.unlock(); }
  function toggleSound() { const value = !muted; setMuted(value); sound.setMuted(value); if (!value) void sound.unlock(); }
  async function share() {
    const text = `ドパボタン「押すな。でも押せ。」\n反射スコア ${game.score}｜${mode.title}\n${location.href.split('#')[0]}\n#ドパボタン`;
    if (navigator.share) {
      try { await navigator.share({ title: 'ドパボタン', text }); setShareStatus('その指の記録をシェアしました。'); return; }
      catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); setShareStatus('結果をコピーしました。友だちの指も試そう。'); }
    catch { setCopyText(text); setShareStatus('下のテキストをコピーしてシェアできます。'); }
  }

  return <div className={`app-shell mode-${game.mode}${gentle ? ' is-reduced' : ''}`} data-phase={game.phase}>
    <div className="ambient ambient-one" aria-hidden="true" /><div className="ambient ambient-two" aria-hidden="true" />
    <header className="site-header"><a className="brand" href="./" aria-label="ドパボタン ホーム"><span className="brand-mark" aria-hidden="true">D<span>!</span></span><span>DOPA<br /><b>BUTTON</b></span></a><div className="header-right"><span className="header-edition">REFLEX × PROBABILITY<br /><b>PLAY WITH YOUR LUCK.</b></span><button className={`sound-toggle${muted ? '' : ' active'}`} data-testid="sound" onClick={toggleSound} aria-pressed={!muted} aria-label={`音声を${muted ? 'オン' : 'オフ'}にする`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m11 5-5 4H3v6h3l5 4V5Z" stroke="currentColor" strokeWidth="1.5" /><path d={muted ? 'm16 9 5 6m0-6-5 6' : 'M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg><span>{muted ? 'SOUND OFF' : 'SOUND ON'}</span></button></div></header>
    {machineLottery ? <MachineLottery onClose={() => { try {sessionStorage.setItem('dopa-main-view','legacy');} catch {/* unavailable */} setMachineLottery(false); }} /> : <main className="main-layout">
      <section className="intro-block"><div className="eyebrow"><span /> NO THINKING. JUST FEEL IT.</div><h1>ドパボタン<span className="title-dot">。</span></h1><p className="tagline">押すな。<br className="desktop-break" /><strong>でも押せ。</strong></p><p className="intro-copy">わかってるのに、指が動く。<br />反射の先で、ありえない確率に出会う。</p><div className="intro-rules"><div><span>01</span><p>「押せ！」なら<strong>1回、押す。</strong></p></div><div><span>02</span><p>「押すな！」なら<strong>何もせず待つ。</strong></p></div><div><span>03</span><p>間違えたら<strong>そこで終了。</strong></p></div></div><div className="probability-note"><span className="tiny-star">✦</span><div><b>偶然は、ちゃんと本物。</b><p>18実験族・1,026条件を独立抽選。<br />演出と実当選は、別々に記録します。</p></div></div></section>
      <div className="machine-column">
        <div className="machine-top-label"><span><i /> PUSH YOUR LUCK</span><span>NO. 001 / INFINITE CHANCES</span></div>
        <section className="cabinet" aria-label="ドパボタンのゲーム" data-testid="game-board">
          <div className="cabinet-corner corner-tl" aria-hidden="true" /><div className="cabinet-corner corner-tr" aria-hidden="true" />
          <div className="score-panel"><div className="score-stat"><span>SCORE</span><strong data-testid="score">{String(game.score).padStart(3, '0')}</strong></div><span className="score-divider" /><div className="best-stat"><span>{game.mode === 'gaming' ? 'GAMING BEST' : 'BEST'}</span><strong data-testid="best">{String(best).padStart(3, '0')}</strong></div><div className="time-stat"><span>TIME LEFT</span><strong data-testid="timer">{remaining}<small>s</small></strong></div></div>
          <div className="timer-track" role="progressbar" aria-label="このラウンドの残り時間" aria-valuemin={0} aria-valuemax={game.roundMs} aria-valuenow={playing ? Math.round(game.remainingMs) : 0}><span style={{ transform: `scaleX(${playing ? Math.max(0, game.remainingMs / game.roundMs) : canChangeMode ? 1 : 0})` }} /></div>
          <div className="instruction-screen" data-prompt={game.prompt} data-phase={game.phase}><span className="phase-label" data-testid="phase">{game.phase === 'ROUND' ? 'FOLLOW THE ORDER' : game.phase}</span><h2 data-testid="instruction" aria-live="assertive" aria-atomic="true">{instruction}</h2><p>{playing ? game.prompt === 'go' ? '今だ。1回だけ押せ。' : '指を止めろ。ゲージがなくなるまで。' : game.phase === 'READY' ? '準備はいい？ PUSHで始めよう。' : game.phase === 'GAME_OVER' ? 'その指、まだ自分のだと思う？' : game.phase === 'COUNTDOWN' ? '次の指示まで、指を離して。' : game.phase === 'PAUSED' ? 'ゲームの時間は止まっています。' : game.phase === 'DRAWING' ? game.mode === 'gaming' ? '成功。5/20/75の演出抽選中。' : '成功。1,026条件を抽選中。' : '成功。その調子。'}</p></div>
          <div className="push-arena"><div className="button-halo" aria-hidden="true" /><div className="button-track" aria-hidden="true" /><span className="arena-label arena-label-left" aria-hidden="true">ONE<br />BUTTON.</span><span className="arena-label arena-label-right" aria-hidden="true">ALL<br />YOUR NERVES.</span><button ref={push} className="push-button" data-testid="main-push" disabled={!canPush || !initialized.current} onPointerDown={() => { inputToken.current = canPush ? controller.current?.getInputToken() ?? null : -1; }} onPointerCancel={() => { inputToken.current = null; }} onKeyDown={event => { if (event.code === 'Space' || event.code === 'Enter') { if (event.repeat) event.preventDefault(); else inputToken.current = controller.current?.getInputToken() ?? null; } }} onClick={pressPush} aria-label={canChangeMode ? game.phase === 'READY' ? 'PUSHでゲームを始める' : 'PUSHでもう一度挑戦する' : playing && game.prompt === 'stop' ? '押すな。触らずに待つ' : 'PUSHを1回押す'}><span className="push-top-line" aria-hidden="true">{game.mode === 'gaming' ? 'GAMING SYSTEM' : 'DOPA BUTTON'}</span><strong>PUSH</strong><span className="push-caption">{game.phase === 'READY' ? 'TAP TO START' : game.phase === 'GAME_OVER' ? 'TRY AGAIN' : 'TRUST YOUR FINGER.'}</span><span className="push-shine" aria-hidden="true" /></button>{['GAP', 'DRAWING'].includes(game.phase) && <span key={game.score} className="success-chip" aria-hidden="true">+1 <small>GOOD!</small></span>}<div className="arena-particles" key={game.score} aria-hidden="true">{game.score > 0 && game.mode !== 'normal' && STARS.slice(0, game.mode === 'gaming' ? 30 : 12).map((style, i) => <i key={i} style={style} />)}</div></div>
          <div className="cabinet-bottom"><span className="status-light"><i />{game.mode === 'gaming' ? 'CASUAL EFFECTS ONLY' : 'EXACT CHANCE. REAL RECORD.'}</span><span className="screw" aria-hidden="true">⊕</span></div>
        </section>
        <div className="mode-selector" role="group" aria-label="ゲームモード">{MODES.map(item => <button key={item.id} data-testid={`mode-${item.id}`} onClick={() => { if (controller.current?.setMode(item.id)) sound.cue('mode'); }} className={game.mode === item.id ? 'selected' : ''} disabled={!canChangeMode} aria-pressed={game.mode === item.id}><span className="mode-icon">{item.icon}</span><span>{item.title}</span>{game.mode === item.id && <i aria-hidden="true" />}</button>)}</div><p className="mode-description">{mode.caption}{game.mode === 'gaming' ? ' 実当選の図鑑は解除しません。' : ' 通常・ドパは最高記録を共有。'}</p>
        <div className="utility-controls"><button data-testid="encyclopedia" onClick={openLibrary} disabled={game.phase === 'BONUS'}><span aria-hidden="true">▤</span> 確率図鑑 <b>{discovered}<small> / 1026</small></b><span aria-hidden="true">↗</span></button><button data-testid="light-toggle" aria-pressed={gentle} onClick={() => setLightReduced(value => !value)}><span aria-hidden="true">☼</span> 光 {gentle ? '控えめ' : '標準'}</button><button aria-pressed={effectsEnabled} onClick={() => setEffectsEnabled(value => !value)}>演出 {effectsEnabled ? 'ON' : 'OFF'}</button></div>
        {game.phase === 'GAME_OVER' && <section className="game-over-summary" aria-label="今回の結果"><div><span>YOUR REFLEX SCORE</span><strong>{game.score}<small>成功</small></strong></div><button data-testid="share" onClick={() => void share()}>結果をシェア <span>↗</span></button><p role="status">{shareStatus}</p>{copyText && <textarea readOnly aria-label="共有する結果" value={copyText} onFocus={event => event.target.select()} rows={4} />}</section>}
        {game.error && <p className="game-error" role="alert">{game.error}</p>}
        <p className="machine-footnote">無料・登録不要。必要なのは、言うことを聞く指だけ。</p>
      </div>
    </main>}
    {!machineLottery && <section className="machine-feature-launch"><button onClick={() => { try {sessionStorage.setItem('dopa-main-view','machine');} catch {/* unavailable */} setMachineLottery(true); }} disabled={!canChangeMode} data-testid="machine-mode">🎰 実機一斉抽選 <span>収録機種の確率を1ボタンで一斉抽選 ↗</span></button></section>}
    {!machineLottery && <section className="bottom-proof"><div><span className="proof-symbol" aria-hidden="true">✦</span><p>反射は、実力。<br /><strong>その先は、偶然。</strong></p></div><div className="proof-stats"><span><strong>{records.totals.plays.toLocaleString('ja-JP')}</strong> TOTAL PLAYS</span><span><strong>{records.totals.successes.toLocaleString('ja-JP')}</strong> SUCCESS</span><span><strong>{records.totals.stopSuccesses.toLocaleString('ja-JP')}</strong> STOP SUCCESS</span></div><span className="proof-badge">1 / 99<small>SHOW TIME</small></span></section>}
    <footer className="site-footer"><span>DOPA BUTTON <i>© 2026</i></span><p>1/99は平均99成功に1回の演出抽選。99回目の保証ではありません。<br />実機一斉抽選は確率を使ったエンタメ。遊技店の結果や勝敗を予測するものではありません。</p><span>MADE FOR YOUR FINGER ↗</span></footer>
    <Encyclopedia open={library} onClose={closeLibrary} records={records} onPreview={['READY', 'GAME_OVER'].includes(libraryOrigin.current) ? preview : undefined} />
    <dialog ref={bonusDialog} className={`bonus-overlay theme-${currentBonus?.theme ?? 'freeze'}${gentle ? ' is-reduced' : ''}`} data-testid="bonus-overlay" data-kind={bonusKind} onCancel={event => { event.preventDefault(); controller.current?.skipBonus(); }} aria-labelledby="bonus-title">
      {currentBonus && <div className="bonus-inner"><div className="bonus-scene" key={`${game.token}-${bonusKind}`} aria-hidden="true"><div className="bonus-noise" /><div className="bonus-radial" /><div className="bonus-stars">{STARS.map((style, i) => <i key={i} style={style} />)}</div><div className="bonus-last-light" /><div className="bonus-numbers">{['1', '99', '257', '1026', bonusEvent?.denominator.slice(0, 25) ?? '∞', '0.000…'].map((n, i) => <span key={i}>{n}</span>)}</div><div className="bonus-emblem">{currentBonus.theme === 'freeze' ? 'Ⅱ' : currentBonus.theme === 'cosmos' ? '✦' : '∞'}</div></div><div className="bonus-copy"><span className={`bonus-kind kind-${bonusKind}`}>{bonusLabel}</span><h2 id="bonus-title">{bonusTitle}</h2><p className="bonus-subtitle">{bonusKind === 'casual' ? '脳より先に、光が来た。' : bonusKind === 'theater' ? '当たったわけじゃない。でも、見せたい。' : bonusKind === 'preview' ? '演出を試しています。記録は解除しません。' : 'その偶然は、あなたの記録になった。'}</p><div className="bonus-event-card">{bonusEvent ? <><span className="bonus-event-tag">{bonusKind === 'actual' ? 'ACTUAL WIN' : 'THEATER EXAMPLE'} / {bonusEvent.id}</span><h3>{bonusEvent.title}</h3><p>{bonusEvent.condition}</p><details><summary className="bonus-probability">{compact(bonusEvent.numerator)} / {compact(bonusEvent.denominator)}<small>正確な分数を見る ＋</small></summary><p className="exact-probability">{bonusEvent.numerator} / {bonusEvent.denominator}</p></details><p className="bonus-fact">✦ {bonusEvent.fact}</p></> : <><span className="bonus-event-tag">GAMING DOPA / EFFECTS ONLY</span><h3>{currentBonus.tier === 'super' ? '超激熱 5%' : '激熱 20%'}</h3><p>成功ごとの5%・20%・75%による排他的な演出。<br />数学イベントの実当選とは無関係です。</p></>}</div><div className="bonus-footer"><span>ゲームの時間は完全停止中</span><button data-testid="bonus-skip" onClick={() => controller.current?.skipBonus()}>{bonusKind === 'preview' ? 'プレビューを閉じる' : '演出をスキップ'} <span>→</span></button></div></div></div>}
    </dialog>
  </div>;
}
