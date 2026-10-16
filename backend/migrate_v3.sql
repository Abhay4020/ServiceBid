-- ============================================================
--  ServiceBid — v3 Migration (Additive — preserves existing data)
--  Run this after schema.sql is already applied.
-- ============================================================

-- 1. Categories table (new)
CREATE TABLE IF NOT EXISTS categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) UNIQUE NOT NULL
);

INSERT INTO categories (name) VALUES
  ('Catering'), ('Cleaning'), ('Construction'), ('Consulting'),
  ('Electrical'), ('Freight & Logistics'), ('IT & Software'),
  ('Marketing'), ('Other'), ('Plumbing'), ('Security')
ON CONFLICT (name) DO NOTHING;

-- 2. Add Google auth fields to users (safe — only if missing)
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20)  DEFAULT 'local';
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id     VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url    TEXT;

-- Make password nullable (Google users won't have one)
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- 3. Add category_id and status to rfq
ALTER TABLE rfq ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE rfq ADD COLUMN IF NOT EXISTS status      VARCHAR(20) DEFAULT 'Upcoming';

-- 4. Add freight/carrier fields to bids
ALTER TABLE bids ADD COLUMN IF NOT EXISTS carrier_name         VARCHAR(255);
ALTER TABLE bids ADD COLUMN IF NOT EXISTS freight_charges      NUMERIC(12,2);
ALTER TABLE bids ADD COLUMN IF NOT EXISTS origin_charges       NUMERIC(12,2);
ALTER TABLE bids ADD COLUMN IF NOT EXISTS destination_charges  NUMERIC(12,2);
ALTER TABLE bids ADD COLUMN IF NOT EXISTS transit_time         VARCHAR(100);

-- 5. New indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_rfq_category_id  ON rfq(category_id);
CREATE INDEX IF NOT EXISTS idx_rfq_status       ON rfq(status);
CREATE INDEX IF NOT EXISTS idx_users_google_id  ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_provider   ON users(auth_provider);
