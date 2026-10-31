import { useState } from 'react';
import { MACHINE_EVENTS, drawEveryMachine, type MachineHit } from './machineLottery';

export function MachineLottery({onClose}:{onClose:()=>void}) {
  const [rounds,setRounds]=useState(0);
  const [last,setLast]=useState<MachineHit[]>([]);
  const [counts,setCounts]=useState<Record<string,number>>({});
  const [error,setError]=useState('');
  function push() {
    try {
      const results=drawEveryMachine();
      setLast(results);
      setRounds(v=>v+1);
      setCounts(prev=>{
        const updated={...prev};
        for(const result of results) if(result.hit) updated[result.event.id]=(updated[result.event.id]??0)+1;
        return updated;
      });
      setError('');
    } catch(e) {setError(e instanceof Error?e.message:'抽選に失敗しました');}
  }
  const hits=last.filter(v=>v.hit);
  return <section className="real-machine-panel" aria-label="実機一斉抽選">
    <div className="real-machine-head"><span>REAL MACHINE LOTTERY</span><button type="button" onClick={onClose}>ゲームに戻る ×</button></div>
    <h2>実機一斉抽選</h2>
    <p>機種を選ばない。収録した実機イベントを、PUSH一発で全件それぞれ独立抽選する。</p>
    <p className="real-machine-warning">現在収録 {MACHINE_EVENTS.length}条件。現行設置機の網羅は未達成。出典付きの掲載確率を使う模擬抽選です。メーカー公式と機種情報サイトを併用し、内訳未確認の数値はその旨を明記します。実際の遊技の当選や収支を再現しません。</p>
    <div className="real-machine-stats">PUSH回数 <strong>{rounds}</strong> ／ 今回の当選 <strong>{hits.length}</strong></div>
    <button className="real-machine-push" type="button" onClick={push} data-testid="machine-push"><small>ALL VERIFIED EVENTS</small><strong>PUSH</strong><span>全件一斉抽選</span></button>
    {error&&<p role="alert">{error}</p>}
    {rounds>0&&<section aria-live="polite" className="real-machine-result">
      <h3>{hits.length ? '当選した確率イベント' : '今回の当選はなし'}</h3>
      {hits.map(v=><article key={v.event.id}><strong>{v.event.machine}</strong><span>{v.event.category}: {v.event.publishedProbability}</span><p>{v.event.condition}</p><a href={v.event.sourceUrl} target="_blank" rel="noopener noreferrer">確率データの出典 ↗</a></article>)}
    </section>}
    <div className="real-machine-list"><h3>収録イベントと累計当選</h3>{MACHINE_EVENTS.map(v=><article key={v.id}><div><strong>{v.machine}</strong><span>{v.maker} · {v.category}</span></div><div><b>{v.publishedProbability}</b><small>累計 {counts[v.id]??0}回</small></div><p>{v.condition}</p><a href={v.sourceUrl} target="_blank" rel="noopener noreferrer">確率データの出典 ↗</a></article>)}</div>
    <p className="real-machine-warning">機種データの追加に応じ、同じPUSHで抽選する対象が増えます。確率が不明な演出、継続率などの条件付き確率を、通常時の抽選に無条件で混ぜません。</p>
  </section>;
}
