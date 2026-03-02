-- 1. Optimistic Concurrency Control (OCC)
ALTER TABLE deals ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- 2. Request Idempotency Cache
CREATE TABLE idempotency_keys (
  key TEXT NOT NULL,
  developer_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed')),
  response_body JSONB,
  response_status INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (key, developer_id)
);

-- Note: To prevent this table from growing infinitely, you should configure a pg_cron job in Supabase to periodically delete old records (e.g. older than 48 hours).
-- Example pg_cron job (requires pg_cron extension):
-- select cron.schedule('clean_idempotency_keys', '0 * * * *', $$
--   DELETE FROM idempotency_keys WHERE created_at < now() - interval '48 hours';
-- $$);
