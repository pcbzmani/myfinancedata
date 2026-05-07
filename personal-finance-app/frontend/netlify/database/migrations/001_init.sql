-- AI rate limiting: one row per (hashed IP, date)
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  ip_hash      TEXT NOT NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, request_date)
);

-- Push notification subscriptions: one row per browser endpoint
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           SERIAL PRIMARY KEY,
  endpoint     TEXT UNIQUE NOT NULL,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
);
