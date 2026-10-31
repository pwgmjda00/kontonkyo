#!/usr/bin/env python3
"""Publish editor-approved, opt-in GitHub Issue entries in a weekly community hall.

Rankings aren't computed from browser-side scores because those aren't server-verifiable.
GitHub moderators add the 'dopa-hall-approved' label only after consent/review.
"""
from __future__ import annotations
import datetime as dt
import json
import os
import re
import urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/"data"/"hall_of_fame.json"
REPO="pwgmjda00/kontonkyo"
ISSUE_BASE=f"https://github.com/{REPO}/issues/"
JST=dt.timezone(dt.timedelta(hours=9))
def short(text: str, limit=60):
    value=re.sub(r"[\x00-\x1f\x7f]+"," ",text).strip()
    return "".join(list(value)[:limit])
def field(body: str, label:str):
    match=re.search(r"^###\s+"+re.escape(label)+r"\s*\n(.+?)(?=\n### |\Z)",body,re.S|re.M)
    return match.group(1).strip() if match else ""
def weekly_date(stamp:str)->dt.date:
    instant=dt.datetime.fromisoformat(stamp.replace("Z","+00:00")).astimezone(JST)
    date=instant.date()
    return date-dt.timedelta(days=date.weekday())
def accepted(issue:dict)->dict|None:
    if issue.get("pull_request") or not str(issue.get("html_url","")).startswith(ISSUE_BASE):return None
    labels=[v.get("name") for v in issue.get("labels",[]) if isinstance(v,dict)]
    if "dopa-hall-approved" not in labels:return None
    body=issue.get("body") or ""
    consent=field(body,"同意")
    if "- [x]" not in consent.lower() and "- [X]" not in consent:return None
    nickname=short(field(body,"公開ニックネーム"),16)
    if not nickname or nickname=="_No response_":return None
    title=short(field(body,"飾りたい称号"),25)
    message=short(field(body,"ひと言"),60)
    mode=short(field(body,"好きなモード"),15)
    if not message or message=="_No response_":return None
    if mode not in ("🟠 パチンコ","🪙 パチスロ","🎭 どっちも"):mode="🎭 どっちも"
    return {"issue":int(issue["number"]),"nickname":nickname,"badge":title if title!="_No response_" else "",
            "message":message,"mode":mode,"url":issue["html_url"],"week":weekly_date(issue["created_at"]).isoformat()}
def main():
    token=os.getenv("GITHUB_TOKEN","")
    if not token:raise SystemExit("GITHUB_TOKEN is required for moderation API")
    url=f"https://api.github.com/repos/{REPO}/issues?state=all&labels=dopa-hall-approved&per_page=100"
    issues=[]
    while url and len(issues)<1000:
        request=urllib.request.Request(url,headers={"Authorization":"Bearer "+token,
            "Accept":"application/vnd.github+json","User-Agent":"dopa-weekly-hall","X-GitHub-Api-Version":"2022-11-28"})
        with urllib.request.urlopen(request,timeout=30) as response:
            issues.extend(json.loads(response.read().decode()))
            links=response.headers.get("Link","")
        link=re.search(r'<([^>]+)>;\s*rel="next"',links)
        url=link.group(1) if link else None
    approved=[entry for raw in issues if (entry:=accepted(raw))]
    buckets:dict[str,list[dict]]={}
    # One appearance per public nickname each week: a showcase, not a monetary ranking.
    for entry in sorted(approved,key=lambda e:e["issue"]):
        week=entry.pop("week")
        collection=buckets.setdefault(week,[])
        if len(collection)<15 and not any(x["nickname"]==entry["nickname"] for x in collection):
            collection.append(entry)
    weeks=[{"week":week,"entries":items} for week,items in sorted(buckets.items(),reverse=True)[:12]]
    dest={"version":1,"weeks":weeks}
    current=json.loads(DEST.read_text(encoding="utf8")) if DEST.exists() else None
    if dest!=current:DEST.write_text(json.dumps(dest,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print(f"Community hall: {len(approved)} approved nominations, {len(weeks)} displayed weeks")
if __name__=="__main__":main()
