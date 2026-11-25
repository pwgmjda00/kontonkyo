CREATE TABLE IF NOT EXISTS votes (day TEXT NOT NULL, client TEXT NOT NULL, phrase INTEGER NOT NULL CHECK(phrase BETWEEN 0 AND 255), PRIMARY KEY(day,client));
CREATE INDEX IF NOT EXISTS votes_day_phrase ON votes(day,phrase);
