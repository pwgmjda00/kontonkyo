CREATE TABLE IF NOT EXISTS duel_votes(day TEXT NOT NULL,client TEXT NOT NULL,phrase INTEGER NOT NULL,PRIMARY KEY(day,client));
CREATE INDEX IF NOT EXISTS duel_votes_day_phrase ON duel_votes(day,phrase);
