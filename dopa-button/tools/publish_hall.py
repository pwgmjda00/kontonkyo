#!/usr/bin/env python3
"""Daily community showcase of opt-in, moderator-approved GitHub Issues.

The hall showcases approved people, not unverified browser-side score rankings.
New approvals appear on their FIRST publication day (Japan time). Existing
entries keep their publication date; removing a label removes the entry.
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
MAX_DAYS=30
MAX_PER_DAY=20

def short(text: str, limit=60):
    value=re.sub(r"[\x00-\x1f\x7f]+"," ",text).strip()
    return "".join(list(value)[:limit])

def field(body: str, label: str):
    match=re.search(r"^###\s+"+re.escape(label)+r"\s*\n(.+?)(?=\n### |\Z)",body,re.S|re.M)
    return match.group(1).strip() if match else ""

def japan_date(timestamp: str)->dt.date:
    return dt.datetime.fromisoformat(timestamp.replace("Z","+00:00")).astimezone(JST).date()

def today_jst()->dt.date:
    return dt.datetime.now(JST).date()

def accepted(issue:dict)->dict|None:
    issue_no=issue.get("number")
    if issue.get("pull_request") or not isinstance(issue_no,int):return None
    if issue.get("html_url")!=f"{ISSUE_BASE}{issue_no}":return None
    labels=[v.get("name") for v in issue.get("labels",[]) if isinstance(v,dict)]
    if "dopa-hall-approved" not in labels:return None
    body=issue.get("body") or ""
    consent=field(body,"同意")
    if not re.search(r"-\s*\[x\]",consent,re.I):return None
    nickname=short(field(body,"公開ニックネーム"),16)
    if not nickname or nickname=="_No response_":return None
    title=short(field(body,"飾りたい称号"),25)
    message=short(field(body,"ひと言"),60)
    mode=short(field(body,"好きなモード"),15)
    if not message or message=="_No response_":return None
    if mode not in ("🟠 パチンコ","🪙 パチスロ","🎭 どっちも"):mode="🎭 どっちも"
    return {"issue":issue_no,"nickname":nickname,"badge":title if title!="_No response_" else "",
            "message":message,"mode":mode,"url":issue["html_url"]}

def compile_hall(approved:list[dict], prior:dict, today:dt.date)->dict:
    """Keep first-publication day stable. A changed/withdrawn approval vanishes."""
    old_days={}
    for block in prior.get("days",[]):
        day=block.get("date","")
        try:
            parsed=dt.date.fromisoformat(day)
        except (ValueError,TypeError):
            continue
        for entry in block.get("entries",[]):
            if isinstance(entry.get("issue"),int):
                old_days[entry["issue"]]=parsed
    # Old week-based records cannot prove a first-publication day: publish them today.
    days:dict[dt.date,list[dict]]={}
    seen_issues=set()
    approved=sorted(approved,key=lambda a:a["issue"])
    by_existing=sorted(approved,key=lambda a:(a["issue"] not in old_days,old_days.get(a["issue"],today),a["issue"]))
    for entry in by_existing:
        issue=entry["issue"]
        if issue in seen_issues:continue
        seen_issues.add(issue)
        day=old_days.get(issue,today)
        if day>today:day=today
        if (today-day).days>=MAX_DAYS:continue
        group=days.setdefault(day,[])
        if len(group)>=MAX_PER_DAY:continue
        if any(e["nickname"]==entry["nickname"] for e in group):continue
        group.append(entry)
    return {"version":2,"days":[{"date":day.isoformat(),"entries":items}
            for day,items in sorted(days.items(),reverse=True)[:MAX_DAYS] if items]}

def main():
    token=os.getenv("GITHUB_TOKEN","")
    if not token:raise SystemExit("GITHUB_TOKEN is required for moderation API")
    url=f"https://api.github.com/repos/{REPO}/issues?state=all&labels=dopa-hall-approved&per_page=100"
    issues=[]
    while url and len(issues)<1000:
        request=urllib.request.Request(url,headers={"Authorization":"Bearer "+token,
            "Accept":"application/vnd.github+json","User-Agent":"dopa-daily-hall","X-GitHub-Api-Version":"2022-11-28"})
        with urllib.request.urlopen(request,timeout=30) as response:
            issues.extend(json.loads(response.read().decode()))
            links=response.headers.get("Link","")
        link=re.search(r'<([^>]+)>;\s*rel="next"',links)
        url=link.group(1) if link else None
    approved=[entry for raw in issues if (entry:=accepted(raw))]
    prior=json.loads(DEST.read_text(encoding="utf8")) if DEST.exists() else {}
    updated=compile_hall(approved,prior,today_jst())
    if updated!=prior:DEST.write_text(json.dumps(updated,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print(f"Daily hall: {len(approved)} approved nominations, {len(updated['days'])} displayed days")

if __name__=="__main__":main()
