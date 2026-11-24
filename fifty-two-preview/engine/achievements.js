/* First rules victory (or full score run) per title. Score/mode records stay in each game. */
(()=>{'use strict';
  if(window.FiftyTwoAchievements)return;
  const catalog=[
  {
    "id": "accordion",
    "name": "アコーディオン",
    "achievement": "初勝利"
  },
  {
    "id": "aces-up",
    "name": "Aces Up",
    "achievement": "初勝利"
  },
  {
    "id": "alchemy",
    "name": "調合",
    "achievement": "初完走"
  },
  {
    "id": "auction",
    "name": "競売",
    "achievement": "初勝利"
  },
  {
    "id": "bakers-dozen",
    "name": "ベイカーズ・ダズン",
    "achievement": "初勝利"
  },
  {
    "id": "balance",
    "name": "天秤",
    "achievement": "初完走"
  },
  {
    "id": "beleaguered-castle",
    "name": "包囲された城",
    "achievement": "初勝利"
  },
  {
    "id": "black-hole",
    "name": "ブラックホール",
    "achievement": "初勝利"
  },
  {
    "id": "blackjack",
    "name": "ブラックジャック",
    "achievement": "初勝利"
  },
  {
    "id": "bluff",
    "name": "虚勢",
    "achievement": "初勝利"
  },
  {
    "id": "borderline",
    "name": "境界",
    "achievement": "初完走"
  },
  {
    "id": "calculation",
    "name": "カリキュレーション",
    "achievement": "初勝利"
  },
  {
    "id": "canfield",
    "name": "キャンフィールド",
    "achievement": "初勝利"
  },
  {
    "id": "clock",
    "name": "時計ソリティア",
    "achievement": "初勝利"
  },
  {
    "id": "contagion",
    "name": "感染",
    "achievement": "初勝利"
  },
  {
    "id": "coronation",
    "name": "戴冠",
    "achievement": "初勝利"
  },
  {
    "id": "countdown",
    "name": "カウントダウン",
    "achievement": "初勝利"
  },
  {
    "id": "crossfire",
    "name": "クロスファイア",
    "achievement": "初完走"
  },
  {
    "id": "cruel",
    "name": "クルーエル",
    "achievement": "初勝利"
  },
  {
    "id": "deadline",
    "name": "デッドライン",
    "achievement": "初完走"
  },
  {
    "id": "echo",
    "name": "残響",
    "achievement": "初勝利"
  },
  {
    "id": "eclipse",
    "name": "エクリプス",
    "achievement": "初勝利"
  },
  {
    "id": "eight-off",
    "name": "エイト・オフ",
    "achievement": "初勝利"
  },
  {
    "id": "elevens",
    "name": "イレブンズ",
    "achievement": "初勝利"
  },
  {
    "id": "fault-line",
    "name": "フォールトライン",
    "achievement": "初完走"
  },
  {
    "id": "flower-garden",
    "name": "フラワーガーデン",
    "achievement": "初勝利"
  },
  {
    "id": "forty-thieves",
    "name": "フォーティ・シーブス",
    "achievement": "初勝利"
  },
  {
    "id": "fourteen-out",
    "name": "フォーティーン・アウト",
    "achievement": "初勝利"
  },
  {
    "id": "freecell",
    "name": "フリーセル",
    "achievement": "初勝利"
  },
  {
    "id": "gaps",
    "name": "ギャップス",
    "achievement": "初勝利"
  },
  {
    "id": "ghost-hand",
    "name": "ゴースト・ハンド",
    "achievement": "初勝利"
  },
  {
    "id": "gin-rummy",
    "name": "ジンラミー",
    "achievement": "初勝利"
  },
  {
    "id": "golf",
    "name": "ゴルフ",
    "achievement": "初勝利"
  },
  {
    "id": "high-low",
    "name": "HIGH / LOW",
    "achievement": "初完走"
  },
  {
    "id": "indian-poker",
    "name": "インディアンポーカー",
    "achievement": "初勝利"
  },
  {
    "id": "informant",
    "name": "密告",
    "achievement": "初完走"
  },
  {
    "id": "judgment",
    "name": "審判",
    "achievement": "初勝利"
  },
  {
    "id": "kings-road",
    "name": "キングズ・ロード",
    "achievement": "初勝利"
  },
  {
    "id": "klondike",
    "name": "クロンダイク",
    "achievement": "初勝利"
  },
  {
    "id": "la-belle-lucie",
    "name": "ラ・ベル・ルーシー",
    "achievement": "初勝利"
  },
  {
    "id": "last-word",
    "name": "ラスト・ワード",
    "achievement": "初勝利"
  },
  {
    "id": "lighthouse",
    "name": "灯台",
    "achievement": "初完走"
  },
  {
    "id": "memory",
    "name": "神経衰弱",
    "achievement": "初勝利"
  },
  {
    "id": "monte-carlo",
    "name": "モンテカルロ",
    "achievement": "初勝利"
  },
  {
    "id": "nestor",
    "name": "ネスター",
    "achievement": "初勝利"
  },
  {
    "id": "old-maid",
    "name": "ババ抜き",
    "achievement": "初勝利"
  },
  {
    "id": "osmosis",
    "name": "オスモシス",
    "achievement": "初勝利"
  },
  {
    "id": "overdrive",
    "name": "限界突破",
    "achievement": "初勝利"
  },
  {
    "id": "paradox-switch",
    "name": "パラドックス・スイッチ",
    "achievement": "初勝利"
  },
  {
    "id": "paradox",
    "name": "逆説",
    "achievement": "初勝利"
  },
  {
    "id": "penguin",
    "name": "ペンギン",
    "achievement": "初勝利"
  },
  {
    "id": "poker-squares",
    "name": "ポーカースクエア",
    "achievement": "初完走"
  },
  {
    "id": "pyramid",
    "name": "ピラミッド",
    "achievement": "初勝利"
  },
  {
    "id": "redline",
    "name": "レッドライン",
    "achievement": "初勝利"
  },
  {
    "id": "reverse-auction",
    "name": "リバース・オークション",
    "achievement": "初勝利"
  },
  {
    "id": "royal-slide",
    "name": "ロイヤル・スライド",
    "achievement": "初勝利"
  },
  {
    "id": "scorpion",
    "name": "スコーピオン",
    "achievement": "初勝利"
  },
  {
    "id": "seal",
    "name": "封印",
    "achievement": "初完走"
  },
  {
    "id": "seven-seals",
    "name": "七つの封印",
    "achievement": "初勝利"
  },
  {
    "id": "sevens",
    "name": "七並べ",
    "achievement": "初勝利"
  },
  {
    "id": "shift",
    "name": "転位",
    "achievement": "初完走"
  },
  {
    "id": "simple-simon",
    "name": "シンプル・サイモン",
    "achievement": "初勝利"
  },
  {
    "id": "spider",
    "name": "スパイダー",
    "achievement": "初勝利"
  },
  {
    "id": "suit-code",
    "name": "スート・コード",
    "achievement": "初勝利"
  },
  {
    "id": "suit-dominion",
    "name": "スート・ドミニオン",
    "achievement": "初勝利"
  },
  {
    "id": "the-answer",
    "name": "THE ANSWER 42",
    "achievement": "初勝利"
  },
  {
    "id": "tripeaks",
    "name": "トライピークス",
    "achievement": "初勝利"
  },
  {
    "id": "trump-jack",
    "name": "トランプ・ジャック",
    "achievement": "初勝利"
  },
  {
    "id": "war",
    "name": "戦争",
    "achievement": "初勝利"
  },
  {
    "id": "witness",
    "name": "目撃",
    "achievement": "初完走"
  },
  {
    "id": "yukon",
    "name": "ユーコン",
    "achievement": "初勝利"
  },
  {
    "id": "zero-sum",
    "name": "ゼロサム",
    "achievement": "初勝利"
  },
  {
    "id": "tombstone",
    "name": "墓標",
    "achievement": "初勝利"
  },
  {
    "id": "accomplice",
    "name": "共犯",
    "achievement": "初勝利"
  },
  {
    "id": "thirteenth-hour",
    "name": "13時",
    "achievement": "初勝利"
  },
  {
    "id": "four-kingdoms",
    "name": "四王国",
    "achievement": "初勝利"
  },
  {
    "id": "oblivion",
    "name": "忘却",
    "achievement": "初勝利"
  }
];
  const ids=new Set(catalog.map(x=>x.id)),prefix='fifty-two-achievement-';
  const scriptURL=document.currentScript?.src;
  const hubIds=['tombstone','accomplice','thirteenth-hour','four-kingdoms','oblivion'];
  const get=k=>{try{return localStorage.getItem(k)}catch{return null}};
  const positive=k=>{const raw=get(k);if(raw===null)return false;const n=Number(raw);return Number.isSafeInteger(n)&&n>0};
  const json=k=>{try{const v=JSON.parse(get(k));return v&&typeof v==='object'&&!Array.isArray(v)?v:null}catch{return null}};
  const numeric=(n)=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
  function legacyWin(id){
    if(positive('fifty-two-'+id+'-wins')||positive('fifty-two-'+id+'-joker-wins'))return true;
    if(id==='gin-rummy')return ['','-joker'].some(s=>{const v=json('fifty-two-gin-rummy-stats-v1'+s);return v&&Number.isSafeInteger(v.w)&&v.w>0});
    if(id==='indian-poker')return ['normal','joker'].some(mode=>{const v=json('fifty-two-record-indian-poker-'+mode);return v&&Number.isSafeInteger(v.wins)&&v.wins>0});
    // These bests were written only after every placement, unlike partial score records.
    if(['poker-squares','crossfire','fault-line'].includes(id))return positive('fifty-two-'+id+'-best')||positive('fifty-two-'+id+'-joker-best');
    // Countdown's maximum 150 is possible only with final value zero. Lower bests prove no victory.
    if(id==='countdown')return get('fifty-two-countdown-best')==='150';
    if(['paradox','judgment','shift','informant','witness'].includes(id))return ['','-joker'].some(s=>{
      const v=json('fifty-two-'+id+'-v1'+s);if(!v)return false;
      if(id==='judgment')return v.phase==='finished'&&Array.isArray(v.wins)&&v.wins.length===3&&v.wins.every(numeric)&&v.wins[0]>v.wins[1]&&v.round===(v.mode==='fast'?3:5);
      if(id==='paradox')return v.phase==='done'&&v.round===7&&numeric(v.mine)&&numeric(v.theirs)&&v.mine>v.theirs;
      return v.phase==='done'&&v.round===5&&numeric(v.score);
    });
    return false;
  }
  const volatileWins=new Set(),failedAwards=new Set();
  function hasWin(id){return ids.has(id)&&(volatileWins.has(id)||get(prefix+id)==='1'||legacyWin(id)||!!window.FiftyTwoJokers?.achievementReceipt?.(id))}
  let queue=Promise.resolve();
  const pending=new Set();
  function markPending(id){if(!failedAwards.has(id)){failedAwards.add(id);window.dispatchEvent(new CustomEvent('fifty-two:achievement-pending',{detail:{id}}))}}
  function award(id){
    if(pending.has(id))return queue;
    pending.add(id);
    queue=queue.then(async()=>{
      try{
        const jokers=window.FiftyTwoJokers;
        const reward=await (jokers?.awardAchievementAsync?jokers.awardAchievementAsync(id):jokers?.awardAchievement?.(id));
        const saved=!!reward||!!jokers?.achievementReceipt?.(id);
        if(saved){if(failedAwards.delete(id))window.dispatchEvent(new CustomEvent('fifty-two:achievement-updated',{detail:{id,pending:false}}))}
        else if(!jokers||jokers.achievementReceipt)markPending(id);
        if(reward)window.dispatchEvent(new CustomEvent('fifty-two:achievement-reward',{detail:{id,reward}}));
        return reward||null;
      }finally{pending.delete(id)}
    }).catch(error=>{pending.delete(id);markPending(id);console.warn('実績報酬の保存を再試行できます。',error?.name||'Error')});
    return queue;
  }
  function recordWin(id){
    if(!ids.has(id))return Promise.resolve(null);
    volatileWins.add(id);
    // An independent proof per title prevents simultaneous wins in different tabs from overwriting one another.
    try{if(get(prefix+id)!=='1')localStorage.setItem(prefix+id,'1')}catch{}
    return award(id);
  }
  let hubMigration=null;
  function readHubHistory(){
    const keys=['fifty-two-save','fifty-two-save-joker',...hubIds.flatMap(id=>['fifty-two-save-'+id,'fifty-two-save-'+id+'-joker'])];
    if(!scriptURL||!keys.some(key=>get(key)!==null))return Promise.resolve();
    // Reuse the game's full structural/card validation even when the library is opened first.
    return import(new URL('./hub-achievements.mjs',scriptURL).href).then(({readHubVictories})=>{
      for(const {id}of readHubVictories(localStorage))recordWin(id);
    }).catch(error=>{hubMigration=null;console.warn('過去の実績は次回再確認します。',error?.name||'Error')});
  }
  function reconcile(){
    if(!hubMigration)hubMigration=readHubHistory();
    for(const {id}of catalog)if(hasWin(id))recordWin(id);
    return hubMigration.then(()=>queue);
  }
  window.FiftyTwoAchievements=Object.freeze({catalog:Object.freeze(catalog.map(Object.freeze)),recordWin,hasWin,reconcile,pending:()=>[...failedAwards],settled:()=>hubMigration?hubMigration.then(()=>queue):queue});
  // Replay verified historical records on any game or the collection; no visit/click inference.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',reconcile,{once:true});else reconcile();
  // Reward state/lease writes must not trigger another reward transaction in another tab.
  window.addEventListener('storage',event=>{const key=event.key;if(key?.startsWith('fifty-two-save')){hubMigration=null;reconcile()}else if(key&&(key.startsWith(prefix)||/^fifty-two-.+-(?:wins|best|v1(?:-joker)?)$/.test(key)||key.startsWith('fifty-two-gin-rummy-stats-')||key.startsWith('fifty-two-record-indian-poker-')))reconcile()});
  window.addEventListener('focus',()=>{if(failedAwards.size)reconcile()});
})();
