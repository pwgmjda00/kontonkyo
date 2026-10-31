#!/usr/bin/env python3
"""Extend the sourced pachislot catalog from individual public model specification pages."""
import concurrent.futures
import datetime
import hashlib
import json
import re
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from sync_machine_catalog import Tables

ROOT=Path(__file__).resolve().parents[1]
TARGET=ROOT/"data"/"verified_machine_events.json"
INDEX="https://pachiyomi.com/slot"
TODAY=datetime.date.today().isoformat()
class Links(HTMLParser):
    def __init__(self):
        super().__init__();self.href=None;self.words=[];self.links=[]
    def handle_starttag(self,tag,attrs):
        if tag=="a":
            self.href=dict(attrs).get("href","");self.words=[]
    def handle_data(self,data):
        if self.href is not None:self.words.append(data)
    def handle_endtag(self,tag):
        if tag=="a" and self.href is not None:
            label=" ".join(" ".join(self.words).split())
            href=urllib.parse.urljoin(INDEX,self.href)
            if re.fullmatch(r"https://pachiyomi\.com/slot/[a-z0-9-]+/?",href) and label:
                self.links.append((label,href))
            self.href=None;self.words=[]
class Text(HTMLParser):
    def __init__(self):super().__init__();self.words=[]
    def handle_data(self,data):self.words.append(data)
def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; DopaCatalogBot/1.0)"})
    with urllib.request.urlopen(req,timeout=15) as resp:return resp.read(2_000_000).decode("utf-8","replace")
def parse_item(item):
    name,url=item
    try:
        doc=fetch(url)
        p=Text();p.feed(doc)
        plain=" ".join(" ".join(p.words).split())
        h=re.search(r"<h1[^>]*>(.*?)</h1>",doc,re.S|re.I)
        if h:
            title=Text();title.feed(h.group(1));name=" ".join(title.words).strip() or name
        if "導入前情報" in name:return None
        # Extract ONLY clearly labelled jackpot/AT/CZ probabilities.
        # Generic "setting 1's 1/xx" previously misread common bells and
        # BIG-time watermelons as jackpot probabilities (e.g. 1/21.8, 1/47.6).
        labels=("AT初当たり","AT初当り","初当たり合算","初当り合算",
                "ボーナス初当たり","ボーナス初当り","疑似ボーナス初当たり",
                "ボーナス合算","AT確率","初当たり確率","初当り確率",
                "初当たり","初当り","CZ合算確率","CZ確率")
        label_pattern="(?:"+"|".join(re.escape(label) for label in labels)+")"
        match=None
        for m in re.finditer(r"("+label_pattern+r")\\s*(?:[:：は=]\\s*)?1\\s*/\\s*(\\d+(?:\\.\\d+)?)", plain):
            if float(m.group(2))<60:continue
            match=m
            break
        if not match:
            table_parser=Tables()
            table_parser.feed(doc)
            # The source tables may be oriented with a setting-1 row OR column.
            for table in table_parser.tables:
                if len(table)<2:continue
                headers=table[0]
                cols=[(i,label) for i,label in enumerate(headers) if any(label.startswith(t) for t in labels)]
                for row in table[1:]:
                    if not row:continue
                    if re.fullmatch(r"(?:設定\\s*)?1[◎★☆]?",row[0].strip()):
                        for i,label in cols:
                            if i<len(row):
                                m=re.search(r"1\\s*/\\s*(\\d+(?:\\.\\d+)?)",row[i])
                                if m and float(m.group(1))>=60:
                                    match=(label,m.group(1));break
                    if match:break
                if match:break
                for row in table[1:]:
                    if len(row)<2 or not any(row[0].strip().startswith(t) for t in labels):continue
                    setting_col=next((i for i,h in enumerate(headers) if "設定1" in h or h.strip()=="1"),1)
                    if setting_col<len(row):
                        m=re.search(r"1\\s*/\\s*(\\d+(?:\\.\\d+)?)",row[setting_col])
                        if m and float(m.group(1))>=60:
                            match=(row[0],m.group(1));break
                if match:break
        if not match:return None
        if isinstance(match,tuple):condition,den=match
        else:condition,den=match.group(1).strip(),match.group(2)
        if den.count("."):a,b=den.split(".");numerator=str(10**len(b));denominator=a+b
        else:numerator="1";denominator=den
        if float(den)<60 or float(den)>1_000_000:return None
        machine_id="slot-detail-"+hashlib.sha256(url.encode()).hexdigest()[:14]
        return {"id":machine_id,"machine":name,"maker":"機種ページ参照","kind":"pachislot",
            "model":None,"introduced":None,"category":condition+"（設定1参考値）",
            "numerator":numerator,"denominator":denominator,"publishedProbability":"約1/"+den,
            "approximate":True,"condition":"設定1の掲載スペックから抽出した参考値。AT・ボーナス合算などの抽選条件を出典で確認してください。",
            "sourceUrl":url,"verifiedAt":TODAY,"currentAvailability":"unverified","sourceStatus":"secondary"}
    except Exception as e:
        print("WARN: not imported",url,str(e)[:120]);return None
def norm(s):
    import unicodedata
    return unicodedata.normalize("NFKC",s).lower().replace(" ","").replace("　","")
def main():
    parser=Links();parser.feed(fetch(INDEX))
    links={url:(name,url) for name,url in parser.links}
    rows=json.loads(TARGET.read_text(encoding="utf-8"))
    names={norm(x["machine"]) for x in rows}
    added=0
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        for result in pool.map(parse_item,links.values()):
            if not result or norm(result["machine"]) in names:continue
            names.add(norm(result["machine"]));rows.append(result);added+=1
    if added:TARGET.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("slot pages",len(links),"added",added,"catalog size",len(rows))
if __name__=="__main__":main()
