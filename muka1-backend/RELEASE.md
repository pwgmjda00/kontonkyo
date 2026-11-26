# MUKA-1 release checklist

Local SQLite migration verification: 256 legacy rows preserved, 256 new IDs accepted, four invalid boundary IDs rejected, integrity_check ok. This is not a production D1 test.

1. Export production D1 backup; record vote count. Pause voting writes before migration.
2. Apply migrate-512.sql as an atomic D1 batch only if legacy schema remains. Verify count and schema. Do not rerun blindly.
3. Apply duel.sql and festival.sql (idempotent).
4. Deploy worker.js with DB binding and existing ADMIN_TOKEN. Leave PHRASE_V2_FROM unset until legacy behavior verified.
5. Verify GET /daily, /ranking, /history, /daily-duel and /festival; test voting with authorized test data and distinguish test votes from real votes.
6. Set a future JST cutover date only after verification. Never change after activation.
7. Verify Pages, OGP HTTP response and mobile share. Publish author link only after acceptance.
8. Analytics is optional and disabled until separate Worker/D1 schema, quota and retention cron are configured and tested.

Production changes remain pending. Do not expose admin secrets. Do not revert the schema after new IDs receive votes.
