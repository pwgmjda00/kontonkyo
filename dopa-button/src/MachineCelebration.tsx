import { useEffect, useRef } from 'react';
import type { MachineHit } from './machineLottery';
import { emojiBurst, machineEmojiPack } from './machineEmoji';
import { machineTrivia } from './machineTrivia';

export function MachineCelebration({
  hits, index, onNext, onSkip
}: {
  hits: readonly MachineHit[];
  index: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const button=useRef<HTMLButtonElement>(null);
  const hit=hits[index];
  useEffect(()=>{button.current?.focus();},[hit?.event.id]);
  if(!hit)return null;
  const machine=hit.event;
  const pack=machineEmojiPack(machine);
  const fact=machineTrivia(machine);
  return <div className="machine-new-overlay" role="dialog" aria-modal="true" aria-labelledby="machine-new-title" data-testid="machine-new-overlay" onKeyDown={event=>{
    if(event.key==='Escape'){event.preventDefault();onSkip();}
  }}>
    <div className="machine-new-radiance" aria-hidden="true"/>
    <div className="machine-new-box">
      <div className="machine-emoji-rain" aria-hidden="true">
        {emojiBurst(pack,12).map((emoji,i)=><span className={'machine-particle particle-'+i} key={machine.id+'-'+i}>{emoji}</span>)}
      </div>
      <div className="machine-new-content">
        <div className="machine-new-top"><span>🌈 NEW MACHINE UNLOCKED</span><span>{index+1} / {hits.length}</span></div>
        <div className="machine-new-hero-emoji" aria-hidden="true">{pack.icons.slice(0,5).join(' ')}</div>
        <h2 id="machine-new-title">{machine.machine}</h2>
        <div className="machine-new-probability"><span>GET!</span> {machine.publishedProbability}</div>
        <p className="machine-new-chant">{pack.chant}</p>
        <p className="machine-new-trivia"><strong>💡 この台の面白ポイント</strong>{fact.theme}</p>
        <div className="machine-new-controls">
          <button ref={button} className="machine-new-next" type="button" onClick={onNext} data-testid="machine-new-next">{index+1<hits.length?'次の新規当選を見る →':'▶ 反射ゲームを再開'}</button>
          {hits.length-index>1&&<button className="machine-new-skip" type="button" onClick={onSkip}>残り{hits.length-index-1}件をまとめてスキップ</button>}
        </div>
        <small>この機種は初獲得！ 次からは自動で流れます。</small>
      </div>
    </div>
  </div>;
}
