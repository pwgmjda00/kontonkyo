# 512 rollout
1. Export D1 backup and record vote count. Pause writes during migration.
2. Apply migrate-512.sql atomically using D1 batch; verify row count and legacy votes. Do not rerun after success.
3. Deploy worker.js without PHRASE_V2_FROM. Verify /daily matches legacy candidates and /ranking works.
4. Verify frontend loads phrases.js and uses /daily in published Pages.
5. Set PHRASE_V2_FROM to a future JST date (YYYY-MM-DD); never change after activation. Verify new IDs and votes after switch. Keep backup and do not revert schema after new votes exist.
6. If API unavailable, frontend uses legacy offline candidates; voting may fail after activation. No fabricated results.
Production migration and deployment not yet performed.
