import json
from pathlib import Path
from fractions import Fraction
from collections import Counter
p=Path(__file__).resolve().parent.parent/'data'/'probability_events_1026.json'
events=json.loads(p.read_text(encoding='utf-8'))
assert len(events)==1026
ids=set()
families=Counter()
eligible=0
for e in events:
    assert e['id'] not in ids
    ids.add(e['id'])
    assert all(isinstance(e[k],str) and e[k].strip() for k in ('title','condition','fact','family','animationId'))
    a,b=int(e['numerator']),int(e['denominator'])
    assert 0<a<=b
    assert Fraction(a,b)==Fraction(e['probability'])
    ok=a*257<=b
    assert e['bonusEligible'] is ok
    assert e['verified'] is True
    eligible+=ok
    families[e['family']]+=1
assert len(families)==18
assert all(v==57 for v in families.values())
print(f'OK: {len(events)} events; {len(families)} families; {eligible} bonus eligible')
