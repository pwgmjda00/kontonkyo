#!/usr/bin/env python3
"""Extend machine catalog from public machine-spec tables; never manufacture odds.
Python stdlib only; saves exact display values as rational decimal approximations.
Run from repository's dopa-button directory: python3 tools/sync_machine_catalog.py
"""
import datetime
import hashlib
import html
import json
import re
import sys
import unicodedata
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "data" / "verified_machine_events.json"
TODAY = datetime.date.today()
PAGES = [
    ("pachinko", "https://pachiyomi.com/list/type/amadigi"),
    ("pachinko", "https://pachiyomi.com/list/type/light-middle"),
    ("pachinko", "https://pachiyomi.com/list/type/middle"),
    ("pachinko", "https://pachiyomi.com/list/type/high-middle"),
    ("pachislot", "https://tenjo-navi.com/spec/"),
]
class Tables(HTMLParser):
    def __init__(self):
        super().__init__();self.tables=[];self.current=None;self.row=None;self.cell=None;self.skip=0
    def handle_starttag(self,tag,attrs):
        if tag=="table":
            self.current=[];self.tables.append(self.current)
        elif self.current is not None:
            if tag=="tr": self.row=[]
            elif tag in ("th","td") and self.row is not None: self.cell=[]
    def handle_data(self,data):
        if self.cell is not None:self.cell.append(data)
    def handle_endtag(self,tag):
        if tag in ("th","td") and self.cell is not None:
            self.row.append(" ".join(" ".join(self.cell).split()));self.cell=None
        elif tag=="tr" and self.row is not None:
            if self.current is not None and self.row:self.current.append(self.row)
            self.row=None
        elif tag=="table":self.current=None
def clean(value):
    return unicodedata.normalize("NFKC",value).replace(" ","").replace("　","").lower()
def decimal_fraction(value):
    m=re.search(r"1\s*/\s*(\d+(?:\.\d+)?)",value)
    if not m:return None
    denom=m.group(1)
    if "." in denom: a,b=denom.split(".");return str(10**len(b)),a+b,denom
    return "1",denom,denom
def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; DopaCatalogBot/1.0; public specs archive)"})
    with urllib.request.urlopen(req,timeout=25) as response:
        content=response.read(4_000_000)
    return content.decode("utf-8",errors="replace")
def rows_for(html_text,kind):
    parser=Tables();parser.feed(html_text)
    for table in parser.tables:
        if not table:continue
        header=table[0]
        if not any("機種" in x for x in header):continue
        n=next((i for i,h in enumerate(header) if "機種" in h),0)
        if kind=="pachinko":
            p=next((i for i,h in enumerate(header) if "大当たり確率" in h or "大当り確率" in h),None)
        else:
            p=next((i for i,h in enumerate(header) if "初当り確率設定1" in h or ("初当り確率" in h and "設定1" in h)),None)
        if p is None:continue
        date_index=next((i for i,h in enumerate(header) if "導入日" in h),None)
        category=next((i for i,h in enumerate(header) if "初当りの種類" in h),None)
        for row in table[1:]:
            if len(row)<=max(n,p):continue
            name=row[n].strip()
            probability=decimal_fraction(row[p])
            if not name or not probability or "導入前情報" in name:continue
            if date_index is not None and len(row)>date_index:
                date_match=re.search(r"(20\d\d)[/-](\d\d?)[/-](\d\d?)",row[date_index])
                if date_match:
                    d=datetime.date(*map(int,date_match.groups()))
                    if d>TODAY:continue
            yield name,probability,row[category] if category is not None and len(row)>category else ("大当たり確率" if kind=="pachinko" else "設定1の初当り")
def main():
    rows=json.loads(TARGET.read_text(encoding="utf-8"))
    seen={clean(x["machine"]) for x in rows}
    failures=[];added=0
    for kind,url in PAGES:
        try:
            results=list(rows_for(fetch(url),kind))
            if not results:failures.append(f"No table found: {url}");continue
            for name,(numerator,denominator,display),category in results:
                if clean(name) in seen:continue
                event_id="sync-"+hashlib.sha256((kind+"|"+clean(name)).encode()).hexdigest()[:16]
                rows.append({
                    "id":event_id,"machine":name,"maker":"未確認","kind":kind,
                    "model":None,"introduced":None,"category":category,
                    "numerator":numerator,"denominator":denominator,
                    "publishedProbability":"約1/"+display,"approximate":True,
                    "condition":("パチスロの設定1" if kind=="pachislot" else "通常時掲載値")+"。初当り・合算・条件付きの定義は出典を要確認。掲載値での模擬抽選。",
                    "sourceUrl":url,"verifiedAt":TODAY.isoformat(),
                    "currentAvailability":"unverified","sourceStatus":"secondary"})
                seen.add(clean(name));added+=1
            print(f"Read {len(results)} table entries: {url}")
        except Exception as exc:failures.append(f"{url}: {exc}")
    if added: TARGET.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"New events: {added}; total events: {len(rows)}; sources failed: {len(failures)}")
    for failure in failures:print("WARN:",failure,file=sys.stderr)
    if failures and not added:sys.exit(1)
if __name__=="__main__":main()
