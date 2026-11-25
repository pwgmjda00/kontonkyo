-- Execute immediately after migrations, before deploying the new Worker.
-- Existing row totals can grow while the old worker is still live.
DROP TABLE IF EXISTS migration_verify_guard;
CREATE TABLE migration_verify_guard(ok INTEGER NOT NULL CHECK(ok=1));
INSERT INTO migration_verify_guard SELECT COUNT(*) >= (SELECT n FROM migration_audit WHERE name='votes') FROM votes;
INSERT INTO migration_verify_guard SELECT COUNT(*) >= (SELECT n FROM migration_audit WHERE name='submissions') FROM submissions;
INSERT INTO migration_verify_guard SELECT COUNT(*) >= (SELECT n FROM migration_audit WHERE name='approved') FROM submissions WHERE status='approved';
INSERT INTO migration_verify_guard SELECT COUNT(*)=0 FROM submissions WHERE status='approved' AND id>999999;
INSERT INTO migration_verify_guard SELECT COUNT(*) >= (SELECT n FROM migration_audit WHERE name='submission_limits') FROM submission_limits;
DROP TABLE migration_verify_guard;
SELECT 'votes' AS name,COUNT(*) AS preserved_rows FROM votes;
SELECT 'approved' AS name,COUNT(*) AS preserved_rows FROM submissions WHERE status='approved';
SELECT 'duel' AS name,COUNT(*) AS rows FROM duel_votes;
SELECT 'championships' AS name,COUNT(*) AS rows FROM championships;
