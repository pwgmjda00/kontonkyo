import './rewards.css';
import { useMemo, useState } from 'react';
import type { MachineDrawEntry } from './machineLottery';
import { MACHINE_EVENTS } from './machineLottery';
import { machineEmojiPack } from './machineEmoji';
import {
  BADGES, STICKER_TIERS, earnedBadges, stickerLevel, ownedCount, totalRewardHits,
  decorateProfile, getEquippedBadge, getFavoriteMachine, type RewardProfile
} from './machineRewards';
import { shareMachineCard, collectionTweet } from './machineCard';
import hallData from '../data/hall_of_fame.json';

type HallEntry={issue:number;nickname:string;badge:string;message:string;mode:string;url:string};
type HallWeek={week:string;entries:HallEntry[]};
const HALL:HallWeek[]=(hallData as {weeks:HallWeek[]}).weeks;
type Tab='stickers'|'badges'|'hall';
const iconFor=(event:MachineDrawEntry)=>machineEmojiPack(event).icons.slice(0,5).join(' ');
const issueURL='https://github.com/pwgmjda00/kontonkyo/issues/new?template=dopa-hall.yml';
const themeURL='https://github.com/pwgmjda00/kontonkyo/issues/new?template=dopa-theme.yml';
const fmt=new Intl.NumberFormat('ja-JP');

export function RewardsHub({profile,onUpdate,disabled=false}:{
  profile:RewardProfile;
  onUpdate:(profile:RewardProfile)=>void;
  disabled?:boolean;
}){
  const [tab,setTab]=useState<Tab>('stickers');
  const [search,setSearch]=useState('');
  const [view,setView]=useState<'owned'|'all'|'holo'>('owned');
  const [maxShown,setMaxShown]=useState(12);
  const [busyId,setBusyId]=useState<string|null>(null);
  const [message,setMessage]=useState('');
  const [opened,setOpened]=useState(false);
  const owned=ownedCount(profile),total=totalRewardHits(profile);
  const badges=earnedBadges(profile),badgeIds=new Set(badges.map(b=>b.id));
  const equipped=getEquippedBadge(profile);
  const favorite=getFavoriteMachine(profile);
  const director=badgeIds.has('director');
  const list=useMemo(()=>MACHINE_EVENTS.filter(m=>{
    const count=profile.counts[m.id]??0;
    if(view==='owned'&&count<1)return false;
    if(view==='holo'&&count<5)return false;
    return !search||m.machine.normalize('NFKC').toLocaleLowerCase('ja').includes(search.normalize('NFKC').toLocaleLowerCase('ja'));
  }).sort((a,b)=>{
    if(a.id===profile.featuredId)return -1;
    if(b.id===profile.featuredId)return 1;
    return (profile.counts[b.id]??0)-(profile.counts[a.id]??0)||a.machine.localeCompare(b.machine,'ja');
  }),[profile,search,view]);
  const update=(changes:Partial<Pick<RewardProfile,'alias'|'featuredId'|'equippedBadge'>>)=>{
    if(disabled)return;
    onUpdate(decorateProfile(profile,changes));
  };
  const save=async(machine:MachineDrawEntry)=>{
    if(busyId)return;
    setBusyId(machine.id);
    try{
      const result=await shareMachineCard(machine,profile);
      setMessage(result==='shared'?'共有メニューに渡しました！':result==='cancelled'?'共有をキャンセルしました。':'記念画像を保存しました！');
    }catch{setMessage('画像の書き出しに失敗しました。端末の保存権限を確認してください。');}
    finally{setBusyId(null);}
  };
  const toX=(machine:MachineDrawEntry)=>{
    const text=collectionTweet(machine,profile)+'\n'+window.location.href;
    window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');
  };
  return <section className="dopa-rewards" aria-label="ドパ・コレクターズ" data-testid="dopa-rewards">
    <button className="dopa-rewards-open" type="button" disabled={disabled} aria-expanded={opened} onClick={()=>setOpened(v=>!v)} data-testid="rewards-open">
      <span className="dopa-rewards-open-icon">🎁</span>
      <span><b>ドパ・コレクターズ</b><small>ステッカー {owned}/{MACHINE_EVENTS.length} · 称号 {badges.length}/{BADGES.length}{equipped?' · '+equipped.emoji+equipped.name:''}</small></span>
      <span aria-hidden="true">{opened?'−':'＋'}</span>
    </button>
    {opened&&!disabled&&<div className="dopa-rewards-body">
      <p className="dopa-rewards-lead">当てる → 育てる → 記念カードにする → 自慢する。仮想玉やメダルの収支とは別の、無料コレクション！</p>
      <label className="dopa-rewards-alias">公開カード用の名前 <input type="text" maxLength={16} placeholder="ドパコレクター（未設定でもOK）" value={profile.alias} onChange={event=>update({alias:event.target.value})}/></label>
      <div className="dopa-rewards-tabs" role="group" aria-label="コレクションの表示">
        {([['stickers','🃏 ステッカー'],['badges','🏅 称号'],['hall','🏆 殿堂・企画']] as const).map(([value,label])=>
          <button key={value} type="button" aria-pressed={tab===value} onClick={()=>setTab(value)}>{label}</button>)}
      </div>
      {tab==='stickers'&&<>
        <div className="dopa-collector-stats">
          <div><small>獲得した機種</small><strong>{owned}<span> / {MACHINE_EVENTS.length}</span></strong></div>
          <div><small>総当選（累計）</small><strong>{fmt.format(total)}<span> 回</span></strong></div>
          <div><small>推し機種</small><strong className="dopa-favorite">{favorite?'💖 '+favorite.machine:'未設定'}</strong></div>
        </div>
        <p className="dopa-evolve-key">🎟️ 1回 → ✨ 2回 → 🌈 5回 → 👑 10回。再当選でステッカーが進化！</p>
        <div className="dopa-collection-tools">
          <input type="search" aria-label="ステッカーを検索" value={search} onChange={e=>{setSearch(e.target.value);setMaxShown(12);}} placeholder="機種名を探す"/>
          <div className="dopa-view-filter">{([['owned','持っている'],['holo','ホロ以上'],['all','全機種']] as const).map(([v,t])=>
            <button type="button" aria-pressed={view===v} onClick={()=>{setView(v);setMaxShown(12);}} key={v}>{t}</button>)}</div>
        </div>
        <div className="dopa-sticker-grid">
          {list.slice(0,maxShown).map(machine=>{
            const count=profile.counts[machine.id]??0,tier=stickerLevel(count);
            const pack=machineEmojiPack(machine);
            return <article className={'dopa-sticker-card tier-'+tier} key={machine.id}>
              <div className="dopa-sticker-eyebrow"><span>{STICKER_TIERS[tier].emoji} {STICKER_TIERS[tier].name}</span><span>{count}回</span></div>
              <div className="dopa-sticker-emoji" aria-hidden="true">{iconFor(machine)}</div>
              <h4>{machine.machine}</h4>
              <p>{count?pack.chant:'ここから当てて解除しよう！'}</p>
              {count>0&&<div className="dopa-sticker-actions">
                <button type="button" disabled={busyId!==null} onClick={()=>void save(machine)}>{busyId===machine.id?'準備中…':'📸 画像にする'}</button>
                <button type="button" onClick={()=>toX(machine)}>𝕏 共有文</button>
                <button type="button" aria-pressed={profile.featuredId===machine.id} onClick={()=>update({featuredId:machine.id})}>{profile.featuredId===machine.id?'💖 推し':'♡ 推しにする'}</button>
              </div>}
              {count===0&&<small>未獲得｜ゲーム内抽選でGET</small>}
            </article>;
          })}
        </div>
        {list.length===0&&<p className="dopa-empty">まだここにはステッカーがない。最初の1枚を当てよう！</p>}
        {list.length>maxShown&&<button className="dopa-more" type="button" onClick={()=>setMaxShown(v=>v+12)}>さらに12枚見る ↓</button>}
      </>}
      {tab==='badges'&&<>
        <p className="dopa-evolve-key">運がよくても、悪くても、続けた証が称号になる。装備した称号は記念カードにも印字される。</p>
        <div className="dopa-badge-grid">
          {BADGES.map(badge=>{
            const ownedBadge=badgeIds.has(badge.id);
            return <article key={badge.id} className={'dopa-badge'+(ownedBadge?' is-earned':'')}>
              <span className="dopa-badge-emoji" aria-hidden="true">{badge.emoji}</span>
              <div><strong>{badge.name}</strong><small>{badge.description}</small></div>
              {ownedBadge?<button type="button" aria-pressed={equipped?.id===badge.id} onClick={()=>update({equippedBadge:badge.id})}>{equipped?.id===badge.id?'装備中 ✓':'装備する'}</button>:<span className="dopa-badge-locked">🔒 未獲得</span>}
            </article>;
          })}
        </div>
        <p className="dopa-rewards-footnote">「当たりを知らぬ者」「不運という才能」もある。ハズレ続きの記録もちゃんと残る。</p>
      </>}
      {tab==='hall'&&<>
        <section className="dopa-hall">
          <h3>🏆 ドパ殿堂｜週間コミュニティ展示</h3>
          <p>希望者のニックネームや称号だけを紹介する場所。順位も賞金もなし。参加無料、本人応募・運営承認制。ブラウザ記録はサーバー検証されないため、公式の実力ランキングではありません。</p>
          {HALL.length===0?<div className="dopa-hall-empty">🏁 初代殿堂の応募受付中！<small>承認された投稿が入ると、ここに週間の記録が掲載される。</small></div>:HALL.map(week=><div className="dopa-hall-week" key={week.week}>
            <h4>📅 {week.week} の週</h4>
            {week.entries.map(entry=><a href={entry.url} target="_blank" rel="noopener noreferrer" key={entry.issue} className="dopa-hall-entry"><strong>🎉 {entry.nickname}</strong><small>{entry.mode} · {entry.badge||'ドパコレクター'}</small><p>{entry.message}</p></a>)}
          </div>)}
          <p className="dopa-rewards-footnote">応募にはGitHubアカウントが必要。投稿内容は公開されるので、本名や住所は書かないでね。応募後、掲載は運営の確認・承認が必要。</p>
          <a href={issueURL} target="_blank" rel="noopener noreferrer" className="dopa-apply">🏆 殿堂掲載に応募する ↗</a>
        </section>
        <section className="dopa-creative-rights">
          <h3>🎬 演出ディレクターへの道</h3>
          <p>20機種集めると演出テーマ応募権が解放！ 自分の考えた絵文字やセリフをドパボタンに提案できる。採用は運営の審査と実装次第。</p>
          <div className="dopa-director-progress"><span style={{width:Math.min(100,owned/20*100)+'%'}}/></div>
          <small>{Math.min(owned,20)} / 20機種 {director?'🎬 解放済み！':'あと'+Math.max(0,20-owned)+'機種'}</small>
          {director?<a href={themeURL} target="_blank" rel="noopener noreferrer" className="dopa-apply">🎨 自分の絵文字演出を応募する ↗</a>:<p className="dopa-rewards-footnote">推し機種を集めて「演出ディレクター」を解除しよう。</p>}
        </section>
      </>}
      {message&&<p className="dopa-share-message" role="status">{message}</p>}
      <p className="dopa-rewards-footnote">獲得・称号はこの端末内に保存。記念画像は端末内で生成する。換金・譲渡・NFT化はできないよ。</p>
    </div>}
  </section>;
}
