#!/usr/bin/env python3
import datetime as dt
import unittest
from publish_hall import accepted, compile_hall, japan_date, short

class HallPublicationTests(unittest.TestCase):
    def sample(self):
        return {
          "number":123,"html_url":"https://github.com/pwgmjda00/kontonkyo/issues/123",
          "created_at":"2026-10-29T15:00:00Z","labels":[{"name":"dopa-hall-approved"}],
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
    def test_approved_consent_is_required(self):
        issue=self.sample()
        result=accepted(issue)
        self.assertIsNotNone(result)
        self.assertEqual(result["nickname"],"ドパ王")
        self.assertEqual(result["mode"],"🟠 パチンコ")
        self.assertEqual(result["issue"],123)
        no_consent=self.sample()
        no_consent["body"]=no_consent["body"].replace("- [X]","- [ ]")
        self.assertIsNone(accepted(no_consent))
        no_approval=self.sample()
        no_approval["labels"]=[]
        self.assertIsNone(accepted(no_approval))
    def test_issue_id_url_consistency_and_no_prs(self):
        item=self.sample()
        item["html_url"]="https://other.example/issues/123"
        self.assertIsNone(accepted(item))
        item=self.sample()
        item["html_url"]="https://github.com/pwgmjda00/kontonkyo/issues/124"
        self.assertIsNone(accepted(item))
        item=self.sample()
        item["pull_request"]={"url":"https://example.com"}
        self.assertIsNone(accepted(item))
    def test_display_sanitization_and_japan_day_boundaries(self):
        self.assertEqual(japan_date("2026-11-01T15:01:00Z").isoformat(),"2026-11-02")
        self.assertEqual(short(" hello\nworld\t123 ",12),"hello world ")
        item=self.sample()
        item["body"]=item["body"].replace("ドパ王","A"*50)
        self.assertEqual(len(accepted(item)["nickname"]),16)
    def test_first_publication_date_stays_same_on_subsequent_daily_runs(self):
        issue=accepted(self.sample())
        day=dt.date(2026,10,31)
        first=compile_hall([issue],{},day)
        self.assertEqual(first["version"],2)
        self.assertEqual(first["days"][0]["date"],"2026-10-31")
        second=compile_hall([issue],first,day+dt.timedelta(days=1))
        self.assertEqual(first,second)
        self.assertEqual(compile_hall([],second,day+dt.timedelta(days=1))["days"],[])
    def test_daily_cap_and_no_duplicate_entries(self):
        day=dt.date(2026,10,31)
        issues=[{**accepted(self.sample()),"issue":i,"url":f"https://github.com/pwgmjda00/kontonkyo/issues/{i}","nickname":f"人{i}"} for i in range(1,30)]
        result=compile_hall(issues+issues,{},day)
        self.assertEqual(len(result["days"]),1)
        self.assertEqual(len(result["days"][0]["entries"]),20)
        self.assertEqual(len(set(e["issue"] for e in result["days"][0]["entries"])),20)
    def test_old_days_drop_out_after_thirty_days(self):
        day=dt.date(2026,10,31)
        issue=accepted(self.sample())
        first=compile_hall([issue],{},day)
        result=compile_hall([issue],first,day+dt.timedelta(days=30))
        self.assertEqual(result["days"],[])

if __name__=="__main__": unittest.main()
