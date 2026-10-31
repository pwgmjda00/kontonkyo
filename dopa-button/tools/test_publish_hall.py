#!/usr/bin/env python3
import unittest
from publish_hall import accepted,weekly_date,short

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
        self.assertEqual(result["week"],"2026-10-26")
        no_consent=self.sample()
        no_consent["body"]=no_consent["body"].replace("- [X]","- [ ]")
        self.assertIsNone(accepted(no_consent))
        no_approval=self.sample()
        no_approval["labels"]=[]
        self.assertIsNone(accepted(no_approval))
    def test_no_external_issue_url_and_no_prs(self):
        item=self.sample()
        item["html_url"]="https://other.example/issues/123"
        self.assertIsNone(accepted(item))
        item=self.sample()
        item["pull_request"]={"url":"https://example.com"}
        self.assertIsNone(accepted(item))
    def test_sanitized_display_and_jst_week_boundaries(self):
        self.assertEqual(weekly_date("2026-11-01T15:01:00Z").isoformat(),"2026-11-02")
        self.assertEqual(short(" hello\nworld\t123 ",12),"hello world ")
        item=self.sample()
        item["body"]=item["body"].replace("ドパ王","A"*50)
        self.assertEqual(len(accepted(item)["nickname"]),16)

if __name__=="__main__": unittest.main()
