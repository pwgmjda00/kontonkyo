import { useEffect, useMemo, useRef, useState } from 'react';
import { EVENTS, EVENT_BY_ID, isBonusEligible, type ProbabilityEvent } from './probability';
import { compareRarity, hundredTrialChance, type RecordState } from './records';
import { MACHINE_EVENTS } from './machineLottery';
import { machineTrivia } from './machineTrivia';
import './encyclopedia.css';

export interface EncyclopediaProps {
  open: boolean;
  onClose: () => void;
  records: RecordState;
  onPreview?: (event: ProbabilityEvent) => void;
}

const FAMILY_NAMES: Record<string, string> = {
  binary_all_zero: 'ビット：すべて0', binary_palindrome: 'ビット：回文',
  birthday_collision: '誕生日：一致あり', birthday_unique: '誕生日：全員違う',
  coin_alternating: 'コイン：交互', coin_exact: 'コイン：表の個数', coin_streak: 'コイン：連続',
  derangement: '順列：完全順列', die_even: 'サイコロ：偶数', die_increasing: '連続一様乱数：昇順',
  die_no_six: 'サイコロ：6なし', die_sixes: 'サイコロ：すべて6',
  lottery_all: '抽選：全的中', lottery_none: '抽選：全不的中',
  permutation_fixed: '順列：指定配置', permutation_reverse: '順列：逆順',
  urn_all_red: '玉：すべて赤', urn_balanced: '玉：同数',
};
const PAGE_SIZE = 36;
type Section = 'math' | 'history' | 'machines';
type Sort = 'rare' | 'likely' | 'title';

function compactInteger(value: string): string {
  return value.length > 24 ? `${value.slice(0, 8)}… (${value.length}桁)` : value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function percent(value: number): string {
  if (value === 0) return '表示精度未満';
  const n = value * 100;
  return n < .001 ? `約${n.toExponential(3)}%` : `約${n.toLocaleString('ja-JP', { maximumFractionDigits: 4 })}%`;
}
function Probability({ event }: { event: ProbabilityEvent }) {
  return <span className="encyclopedia-probability" title={`${event.numerator}/${event.denominator}`}>
    {compactInteger(event.numerator)}<i>/</i>{compactInteger(event.denominator)}
  </span>;
}

export function Encyclopedia({ open, onClose, records, onPreview }: EncyclopediaProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [section, setSection] = useState<Section>('math');
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');
  const [sort, setSort] = useState<Sort>('rare');
  const [foundOnly, setFoundOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [machineQuery, setMachineQuery] = useState('');
  const [machinePage, setMachinePage] = useState(0);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const foundCount = Object.keys(records.discoveries).length;
  const actualCount = Object.values(records.discoveries).reduce((sum, hit) => sum + BigInt(hit.count), 0n);
  const families = useMemo(() => [...new Set(EVENTS.map(event => event.family))], []);
  const normalizedQuery = query.normalize('NFKC').toLocaleLowerCase('ja-JP').trim();
  const filtered = useMemo(() => EVENTS.filter(event =>
    (family === 'all' || event.family === family)
    && (!foundOnly || records.discoveries[event.id])
    && (!normalizedQuery || `${event.id} ${event.title} ${event.condition} ${event.fact} ${FAMILY_NAMES[event.family] ?? event.family}`.normalize('NFKC').toLocaleLowerCase('ja-JP').includes(normalizedQuery))
  ).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'ja') : (sort === 'rare' ? 1 : -1) * compareRarity(a, b)), [family, foundOnly, normalizedQuery, sort, records.discoveries]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const shown = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const rarest = records.rarestId ? EVENT_BY_ID.get(records.rarestId) : undefined;
  const machineFiltered = MACHINE_EVENTS.filter(item => [item.machine, item.maker, item.category].join(' ').normalize('NFKC').toLocaleLowerCase('ja').includes(machineQuery.normalize('NFKC').toLocaleLowerCase('ja')));
  const machinePages = Math.max(1, Math.ceil(machineFiltered.length / PAGE_SIZE));
  const machineCurrentPage = Math.min(machinePage,machinePages-1);

  function resetSearch(change: () => void) { change(); setPage(0); }

  return <dialog ref={dialog} className="encyclopedia-modal" aria-labelledby="encyclopedia-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClose={() => { if (open) onClose(); }}>
    <header className="encyclopedia-header">
      <div><span className="encyclopedia-kicker">THE ODDS ARCHIVE</span><h2 id="encyclopedia-title">確率の図鑑</h2></div>
      <button type="button" className="encyclopedia-close" onClick={onClose} aria-label="図鑑を閉じる">×</button>
    </header>

    <div className="encyclopedia-summary">
      <div><strong>{foundCount.toLocaleString('ja-JP')}<small> / {EVENTS.length}</small></strong><span>実当選した条件</span></div>
      <div><strong>{actualCount.toLocaleString('ja-JP')}</strong><span>実当選の累計</span></div>
      <div><strong>{records.totals.successes.toLocaleString('ja-JP')}</strong><span>成功ラウンド</span></div>
    </div>
    <p className="encyclopedia-intro">18の実験族 × 57条件。1026件は数学的な条件の数です。実機のパチンコ・パチスロ確率ではありません。</p>

    <nav className="encyclopedia-tabs" aria-label="図鑑の種類">
      <button type="button" aria-pressed={section === 'math'} onClick={() => setSection('math')}>数学イベント <b>{EVENTS.length}</b></button>
      <button type="button" aria-pressed={section === 'history'} onClick={() => setSection('history')}>実当選の履歴</button>
      <button type="button" aria-pressed={section === 'machines'} onClick={() => setSection('machines')}>実機資料 <b>{MACHINE_EVENTS.length}</b></button>
    </nav>

    {section === 'math' && <>
      <div className="encyclopedia-filters">
        <label className="encyclopedia-search">名前・条件で検索<input type="search" value={query} onChange={event => resetSearch(() => setQuery(event.target.value))} placeholder="例：コイン、誕生日、EV0001" autoComplete="off" /></label>
        <label>実験族<select value={family} onChange={event => resetSearch(() => setFamily(event.target.value))}><option value="all">18族すべて</option>{families.map(id => <option key={id} value={id}>{FAMILY_NAMES[id] ?? id}</option>)}</select></label>
        <label>並び順<select value={sort} onChange={event => resetSearch(() => setSort(event.target.value as Sort))}><option value="rare">希少な順</option><option value="likely">当たりやすい順</option><option value="title">名前順</option></select></label>
      </div>
      <div className="encyclopedia-list-top"><label><input type="checkbox" checked={foundOnly} onChange={event => resetSearch(() => setFoundOnly(event.target.checked))} />実当選済みだけ</label><span role="status">{filtered.length.toLocaleString('ja-JP')}条件</span></div>
      <div className="encyclopedia-events">
        {shown.map(event => {
          const discovery = records.discoveries[event.id];
          return <article key={event.id} className={`encyclopedia-card${discovery ? ' is-discovered' : ''}`} data-event-id={event.id}>
            <div className="encyclopedia-card-meta"><span>{FAMILY_NAMES[event.family] ?? event.family}</span><span>{event.id}</span></div>
            <h3>{event.title}</h3>
            <p className="encyclopedia-condition">{event.condition}</p>
            <Probability event={event} />
            <div className="encyclopedia-tags"><span className={discovery ? 'found' : ''}>{discovery ? `実当選 × ${discovery.count.toLocaleString('ja-JP')}` : '未当選'}</span>{isBonusEligible(event) && <span>BONUS対象</span>}</div>
            <p className="encyclopedia-fact">{event.fact}</p>
            <p className="encyclopedia-comparison">100回の独立試行で1回以上：<strong>{percent(hundredTrialChance(event))}</strong><small>表示は近似値。100回目の保証ではありません。</small></p>
            <details className="encyclopedia-exact"><summary>正確な分数を見る</summary><code>{event.numerator}/{event.denominator}</code></details>
            {onPreview && <button type="button" className="encyclopedia-preview" onClick={() => onPreview(event)}>演出プレビュー <span>↗</span></button>}
          </article>;
        })}
      </div>
      {!shown.length && <p className="encyclopedia-empty">条件に一致するイベントはありません。</p>}
      <div className="encyclopedia-pagination"><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>← 前へ</button><span>{currentPage + 1} / {pageCount}</span><button type="button" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>次へ →</button></div>
      <p className="encyclopedia-note">プレビューは演出の見本です。実当選の履歴・図鑑は解除しません。通常・ドパは成功ごとに全1026条件をそれぞれ独立に抽選します。</p>
    </>}

    {section === 'history' && <section className="encyclopedia-history" aria-label="実当選の履歴">
      {rarest && <div className="encyclopedia-rarest"><span>これまでで最も希少な実当選</span><h3>{rarest.title}</h3><Probability event={rarest} /><p>{rarest.condition}</p></div>}
      <p className="encyclopedia-intro">実当選だけの直近100件。古い履歴が消えても、累計当選数と図鑑は残ります。ゲーミングドパの演出・確率シアターは入りません。</p>
      {!records.history.length ? <p className="encyclopedia-empty">まだ実当選の記録はありません。通常・ドパで成功を重ねよう。</p> : <ol className="encyclopedia-history-list">{[...records.history].reverse().map(hit => {
        const event = EVENT_BY_ID.get(hit.eventId);
        if (!event) return null;
        return <li key={hit.id}><div><strong>{event.title}</strong><span>{hit.mode === 'normal' ? '通常' : 'ドパ'} · スコア {hit.score}</span></div><Probability event={event} /><time dateTime={hit.at}>{new Date(hit.at).toLocaleString('ja-JP')}</time></li>;
      })}</ol>}
    </section>}

    {section === 'machines' && <section className="encyclopedia-machines" aria-label="実機資料">
      <p className="encyclopedia-intro">パチンコ・パチスロ {MACHINE_EVENTS.length}条件。好きな作品を探して、その台ならではの面白ポイントも覗いてみよう。</p>
      <label className="encyclopedia-search">機種を検索
        <input type="search" value={machineQuery} placeholder="例：北斗、ジャグラー、エヴァ" onChange={event=>{setMachineQuery(event.target.value);setMachinePage(0);}}/>
      </label>
      <p className="encyclopedia-note">作品や機種を横断して面白ポイントを探せます。表示確率はゲーム用の模擬抽選に使う値です。</p>
      <div className="encyclopedia-events">
        {machineFiltered.slice(machineCurrentPage*PAGE_SIZE,(machineCurrentPage+1)*PAGE_SIZE).map(machine=><article className="encyclopedia-card" key={machine.id}>
          <div className="encyclopedia-card-meta"><span>{machine.maker}</span><span>{machine.kind==='pachinko'?'パチンコ':'パチスロ'}</span></div>
          <h3>{machine.machine}</h3>
          <strong className="encyclopedia-probability">{machine.publishedProbability}</strong>
          <p className="encyclopedia-fact">💡 <strong>面白ポイント</strong> {machineTrivia(machine).highlight}</p>
          <details className="machine-trivia-details"><summary>シリーズの豆知識をもっと見る</summary><p>{machineTrivia(machine).theme}</p><p>{machineTrivia(machine).odds}</p><p>{machineTrivia(machine).context}</p></details>
        </article>)}
      </div>
      {!machineFiltered.length&&<p className="encyclopedia-empty">該当する実機はありません。</p>}
      <div className="encyclopedia-pagination"><button type="button" disabled={machineCurrentPage===0} onClick={()=>setMachinePage(n=>Math.max(0,n-1))}>← 前へ</button><span>{machineCurrentPage+1} / {machinePages}</span><button type="button" disabled={machineCurrentPage+1>=machinePages} onClick={()=>setMachinePage(n=>n+1)}>次へ →</button></div>
      <p className="encyclopedia-note">実機確率の模擬抽選は実機一斉モードで行います。通常・ドパでは元の数学イベントを抽選します。</p>
    </section>}
  </dialog>;
}

export default Encyclopedia;
