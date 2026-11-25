-- Back up D1 first. Execute as a single atomic D1 batch; do not rerun after success.
CREATE TABLE votes_v2 (day TEXT NOT NULL, client TEXT NOT NULL, phrase INTEGER NOT NULL CHECK(phrase BETWEEN 0 AND 255 OR phrase BETWEEN 1000255 AND 1000510), PRIMARY KEY(day,client));
INSERT INTO votes_v2(day,client,phrase) SELECT day,client,phrase FROM votes;
DROP TABLE votes;
ALTER TABLE votes_v2 RENAME TO votes;
CREATE INDEX votes_day_phrase ON votes(day,phrase);
