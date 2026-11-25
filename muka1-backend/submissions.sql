CREATE TABLE IF NOT EXISTS submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')), created TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS submissions_status ON submissions(status,id);
