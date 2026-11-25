CREATE TABLE IF NOT EXISTS festivals (id TEXT PRIMARY KEY, opens TEXT NOT NULL, closes TEXT NOT NULL, candidates TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS festival_votes (festival TEXT NOT NULL, client TEXT NOT NULL, phrase INTEGER NOT NULL, PRIMARY KEY(festival,client));
CREATE INDEX IF NOT EXISTS festival_votes_counts ON festival_votes(festival,phrase);
