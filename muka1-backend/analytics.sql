-- Anonymous event counts only. No IP, UA, URL, title, or free text columns.
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  time TEXT NOT NULL,
  event TEXT NOT NULL,
  mode TEXT NOT NULL,
  source TEXT NOT NULL,
  invite TEXT
);
CREATE INDEX IF NOT EXISTS analytics_events_day ON analytics_events(day);
CREATE INDEX IF NOT EXISTS analytics_events_invite ON analytics_events(invite,day);
CREATE TABLE IF NOT EXISTS analytics_daily (
  day TEXT NOT NULL,
  event TEXT NOT NULL,
  mode TEXT NOT NULL,
  source TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,event,mode,source)
);
