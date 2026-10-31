#!/usr/bin/env python3
import datetime as dt
import unittest
from publish_hall import accepted, compile_hall, japan_date, short

class HallPublicationTests(unittest.TestCase):
    def sample(self):
        return {
          "number":123,"html_url":"https://github.com/pwgmjda00/kontonkyo/issues/123",
          "title":"[ドパ殿堂応募] ドパ王","state":"open",
          "created_at":"2026-10-29T15:00:00Z","labels":[],
          "body": """### 公開ニックネーム

ドパ王

### 好きなモード

🟠 パチンコ

### 飾りたい称号

最初の一撃

### ひと言

この台に会えた！

### 同意

- [X] このニックネーム・称号・ひと言を公開サイトに掲載してよい
""",
        }
    def test_immediate_consent_no_approval_needed(self):
        result=accepted(self.sample())
        self.assertIsNotNone(result)
        self.assertEqual(result["nickname"],"ドパ王")
        self.assertEqual(result["mode"],"🟠 パチンコ")
        self.assertEqual(result["issue"],123)
        item=self.sample()
        item["body"]=item["body"].replace("- [X]","- [ ]")
        self.assertIsNone(accepted(item))
    def test_closed_hidden_wrong_template_url_and_pull_requests(self):
        item=self.sample()
        item["state"]="closed"
        self.assertIsNone(accepted(item))
        item=self.sample()
        item["labels"]=[{"name":"dopa-hall-hide"}]
        self.assertIsNone(accepted(item))
        item=self.sample()
        item["title"]="unrelated issue"
        self.assertIsNone(accepted(item))
        item=self.sample()
        item["html_url"]="https://other.example/issues/123"
        self.assertIsNone(accepted(item))
        item=self.sample()
        item["pull_request"]={"url":"https://example.com"}
        self.assertIsNone(accepted(item))
    def test_sanitization_and_jst_day_boundaries(self):
        self.assertEqual(japan_date("2026-11-01T15:01:00Z").isoformat(),"2026-11-02")
        self.assertEqual(short(" hello\nworld\t123 ",12),"hello world ")
        item=self.sample()
        item["body"]=item["body"].replace("ドパ王","A"*50)
        self.assertEqual(len(accepted(item)["nickname"]),16)
        item=self.sample()
        item["body"]=item["body"].replace("この台に会えた！","https://malicious.example")
        self.assertIsNone(accepted(item))
    def test_submission_date_stays_stable_across_daily_runs(self):
        issue=accepted(self.sample())
        day=dt.date(2026,10,31)
        first=compile_hall([issue],{},day)
        self.assertEqual(first["days"][0]["date"],"2026-10-30")
        second=compile_hall([issue],first,day+dt.timedelta(days=1))
        self.assertEqual(first,second)
        self.assertEqual(compile_hall([],second,day+dt.timedelta(days=1))["days"],[])
    def test_daily_cap_and_duplicates(self):
        day=dt.date(2026,10,31)
        items=[{**accepted(self.sample()),"issue":i,"url":f"https://github.com/pwgmjda00/kontonkyo/issues/{i}","nickname":f"人{i}","createdAt":"2026-10-31T00:30:00Z"} for i in range(1,30)]
        result=compile_hall(items+items,{},day)
        self.assertEqual(len(result["days"]),1)
        self.assertEqual(len(result["days"][0]["entries"]),20)
        self.assertEqual(len(set(e["issue"] for e in result["days"][0]["entries"])),20)
    def test_old_days_expire_after_thirty_days(self):
        day=dt.date(2026,10,31)
        issue=accepted(self.sample())
        self.assertEqual(compile_hall([issue],{},day+dt.timedelta(days=31))["days"],[])

if __name__=="__main__": unittest.main()
