-- Run with wrangler d1 migrations apply after a verified remote export.
-- D1 applies each migration atomically. Rebuilding removes the legacy 0..255 CHECK.
-- ID validation is performed against the shared catalog by the Worker, allowing growth.
CREATE TABLE IF NOT EXISTS submission_limits(day TEXT NOT NULL,bucket TEXT NOT NULL,n INTEGER NOT NULL,PRIMARY KEY(day,bucket));
CREATE TABLE IF NOT EXISTS migration_audit(name TEXT PRIMARY KEY,n INTEGER NOT NULL);
INSERT OR IGNORE INTO migration_audit SELECT 'votes',COUNT(*) FROM votes;
INSERT OR IGNORE INTO migration_audit SELECT 'submissions',COUNT(*) FROM submissions;
INSERT OR IGNORE INTO migration_audit SELECT 'approved',COUNT(*) FROM submissions WHERE status='approved';
INSERT OR IGNORE INTO migration_audit SELECT 'submission_limits',COUNT(*) FROM submission_limits;
CREATE TABLE votes_512 (day TEXT NOT NULL,client TEXT NOT NULL,phrase INTEGER NOT NULL CHECK(phrase>=0),PRIMARY KEY(day,client));
INSERT INTO votes_512(day,client,phrase) SELECT day,client,phrase FROM votes;
CREATE TABLE migration_count_guard(ok INTEGER NOT NULL CHECK(ok=1));
INSERT INTO migration_count_guard SELECT (SELECT COUNT(*) FROM votes)=(SELECT COUNT(*) FROM votes_512);
INSERT INTO migration_count_guard SELECT COUNT(*)=0 FROM submissions WHERE status='approved' AND id>999999;
DROP TABLE migration_count_guard;
DROP TABLE votes;
ALTER TABLE votes_512 RENAME TO votes;
CREATE INDEX votes_day_phrase ON votes(day,phrase);
CREATE TABLE IF NOT EXISTS duel_votes(day TEXT NOT NULL,client TEXT NOT NULL,phrase INTEGER NOT NULL CHECK(phrase>=0),PRIMARY KEY(day,client));
CREATE INDEX IF NOT EXISTS duel_day_phrase ON duel_votes(day,phrase);
CREATE TABLE IF NOT EXISTS championships(id TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN ('day','week','month','year')),period TEXT NOT NULL,start TEXT NOT NULL,end TEXT NOT NULL,candidates TEXT NOT NULL,results TEXT NOT NULL,winners TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('open','closed','insufficient')),finalized TEXT);
CREATE INDEX IF NOT EXISTS championship_period ON championships(kind,end);
CREATE TABLE IF NOT EXISTS festival_votes(festival TEXT NOT NULL,client TEXT NOT NULL,phrase INTEGER NOT NULL CHECK(phrase>=0),PRIMARY KEY(festival,client));
CREATE INDEX IF NOT EXISTS festival_phrase ON festival_votes(festival,phrase);
-- Existing submission IDs remain 255+id. New built-ins begin at 1000255.
CREATE TRIGGER IF NOT EXISTS submissions_id_limit BEFORE INSERT ON submissions WHEN (SELECT COALESCE(MAX(id),0) FROM submissions)>=999999 BEGIN SELECT RAISE(ABORT,'submission id range exhausted'); END;
CREATE TRIGGER IF NOT EXISTS submissions_id_guard AFTER INSERT ON submissions WHEN NEW.id>999999 BEGIN SELECT RAISE(ABORT,'submission id range exhausted'); END;
CREATE TABLE IF NOT EXISTS submission_limits(day TEXT NOT NULL,bucket TEXT NOT NULL,n INTEGER NOT NULL,PRIMARY KEY(day,bucket));

CREATE TABLE IF NOT EXISTS festival_state(key TEXT PRIMARY KEY,value TEXT NOT NULL);
