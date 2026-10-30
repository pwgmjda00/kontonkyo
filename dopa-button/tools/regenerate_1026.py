import json,math,random
from fractions import Fraction
from pathlib import Path
out=[]
def add(family,n,p,title,condition,fact,theme):
 assert 0<p<=1
 out.append(dict(id=f'EV{len(out)+1:04d}',family=family,title=title,condition=condition,numerator=str(p.numerator),denominator=str(p.denominator),probability=f'{p.numerator}/{p.denominator}',fact=fact,animationId=theme,sourceStatus='mathematical',verified=True,bonusEligible=p<=Fraction(1,257)))
for i in range(57):
 n=i+4
 add('coin_streak',n,Fraction(1,2**n),f'表が{n}回連続',f'公平で独立なコインを{n}回投げ、すべて表','独立試行の積の法則。','freeze')
 add('coin_exact',n,Fraction(math.comb(n,n//2),2**n),f'{n}投中ちょうど{n//2}回表',f'公平なコインを{n}回投げ、表がちょうど{n//2}回','二項分布の確率。','numbers')
 add('coin_alternating',n,Fraction(2,2**n),f'{n}投で表裏交互',f'公平なコインを{n}回投げ、表裏または裏表から交互に出る','交互列は2通りだけ。','freeze')
 add('die_sixes',n,Fraction(1,6**n),f'6の目が{n}回連続',f'公平な6面サイコロを{n}回振り、すべて6','指定された独立した目の積。','numbers')
 add('die_no_six',n,Fraction(5**n,6**n),f'{n}回連続6なし',f'公平な6面サイコロを{n}回振り、一度も6が出ない','余事象を考えると分かりやすい。','cosmos')
 add('die_even',n,Fraction(1,2**n),f'{n}回連続偶数',f'公平な6面サイコロを{n}回振り、すべて偶数','偶数は6面中3面。','freeze')
 add('die_increasing',n,Fraction(1,math.factorial(n)),f'{n}個の目が昇順',f'独立で連続一様な乱数を{n}個引き、引いた順が厳密昇順','同順位が起こらず、すべての順序が等確率。','numbers')
 add('permutation_fixed',n,Fraction(1,math.factorial(n)),f'{n}枚が完全一致',f'{n}枚の異なるカードを均等にシャッフルし、元の順番と完全一致','並べ方はn!通り。','freeze')
 add('permutation_reverse',n,Fraction(1,math.factorial(n)),f'{n}枚が完全逆順',f'{n}枚の異なるカードを均等にシャッフルし、元の順番の完全逆順','特定の並びはどれも同確率。','cosmos')
 der=round(math.factorial(n)/math.e) if n<30 else sum((-1)**k*math.factorial(n)//math.factorial(k) for k in range(n+1))
 # exact derangements recurrence, replacing floating approximation
 d0,d1=1,0
 for k in range(2,n+1):d0,d1=d1,(k-1)*(d1+d0)
 der=d1
 add('derangement',n,Fraction(der,math.factorial(n)),f'{n}人全員が自分以外',f'{n}人の名前付き封筒を一対一で均等に再配布し、誰も自分の封筒を受け取らない','完全順列の確率は人数増加で1/eに近づく。','numbers')
 add('birthday_collision',n,Fraction(365**n-math.prod(range(365-n+1,366)),365**n),f'{n}人で誕生日一致',f'{n}人の誕生日が独立かつ365日に一様と仮定し、少なくとも2人が一致','実際の誕生日分布は一様ではない。','cosmos')
 add('birthday_unique',n,Fraction(math.prod(range(365-n+1,366)),365**n),f'{n}人の誕生日全員別',f'{n}人の誕生日が独立かつ365日に一様と仮定し、全員異なる','一致確率の余事象。','numbers')
 add('lottery_all',n,Fraction(1,math.comb(100,n)),f'100個から{n}個を全的中',f'100個の異なる番号から重複なく{n}個選び、事前指定した{n}個と集合として完全一致','順番を問わない組合せ抽選。','freeze')
 add('lottery_none',n,Fraction(math.comb(200-n,n),math.comb(200,n)),f'200個から{n}個を全外し',f'200個から{n}個を選び、事前指定の{n}個と一つも重ならない','非重複の選び方を数える。','numbers')
 add('urn_all_red',n,Fraction(math.comb(60,n),math.comb(120,n)),f'赤60白60から{n}個全部赤',f'赤60個白60個の玉から戻さず{n}個引き、全部赤','非復元抽出なので独立試行ではない。','freeze')
 add('urn_balanced',n,Fraction(math.comb(60,n//2)*math.comb(60,n-n//2),math.comb(120,n)),f'{n}個で赤が{n//2}個',f'赤60個白60個の玉から戻さず{n}個引き、赤がちょうど{n//2}個','超幾何分布。','numbers')
 add('binary_palindrome',n,Fraction(2**((n+1)//2),2**n),f'{n}ビットの回文',f'独立で公平な{n}ビットの列が左右対称','前半を決めると後半が固定される。','cosmos')
 add('binary_all_zero',n,Fraction(1,2**n),f'{n}ビットすべて0',f'独立で公平な{n}ビットの列がすべて0','一つの特定ビット列の確率。','freeze')
assert len(out)==1026
assert len({x['id'] for x in out})==1026
from collections import Counter
c=Counter((x['family'],x['condition']) for x in out)
print('duplicates',[(k,v) for k,v in c.items() if v>1][:4])
for x in out:
 p=Fraction(int(x['numerator']),int(x['denominator']))
 assert 0<p<=1 and x['bonusEligible']==(p<=Fraction(1,257))
root=Path('/mnt/data/dopa')
(root/'probability_events_1026.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
(root/'README.md').write_text('''# ドパボタン確率データ1026件\n\n18種類の数学的実験 × 各57条件 = 1026件。すべて有理数で厳密に表現。実機の未検証データは含めない。\n\n- `bonusEligible`: 個別イベント確率が1/257以下であること。\n- 実当選と確率シアターは別物。\n- 演出トリガーは成功ラウンドごとに独立1/99。演出トリガーは実当選を保証しない。\n- 同じ確率値を持つ異なる数学的事象が存在する。これは重複データではない。\n- 独立抽選イベント数が多いと実当選が多数発生するため、UI上の演出頻度と実当選は必ず分離する。\n- 実当選の表示・履歴にはイベントごとの正確な当選を保存する。\n- このデータは18の実験族からパラメータ展開したもの。1026個すべてが別の学術的発見であるという意味ではない。\n\n`build.py` を実行すると再生成できる。\n''',encoding='utf8')
print('events',len(out),'eligible',sum(x['bonusEligible'] for x in out),'size', (root/'probability_events_1026.json').stat().st_size)
