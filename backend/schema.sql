-- ============================================================
--  ServiceBid — PostgreSQL Schema
--  Run this SQL in your database to set up all 4 tables.
-- ============================================================

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100)  NOT NULL,
  email        VARCHAR(255)  UNIQUE NOT NULL,
  password     VARCHAR(255),
  role         VARCHAR(10)   NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   DEFAULT NOW()
);

-- 2. Requirements (RFQ)
--    trigger_window    : minutes before bid_close_time when extension is triggered (default 5)
--    extension_duration: minutes added when triggered (default 5)
--    trigger_type      : what triggers extension — always 'ANY_BID' in this version
CREATE TABLE IF NOT EXISTS rfq (
  id                 SERIAL PRIMARY KEY,
  name               VARCHAR(255)  NOT NULL,
  description        TEXT,
  created_by         INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  service_date       TIMESTAMPTZ,
  bid_start_time     TIMESTAMPTZ   NOT NULL,
  bid_close_time     TIMESTAMPTZ   NOT NULL,
  forced_close_time  TIMESTAMPTZ   NOT NULL,
  trigger_window     INTEGER       DEFAULT 5,
  extension_duration INTEGER       DEFAULT 5,
  trigger_type       VARCHAR(20)   DEFAULT 'ANY_BID',
  created_at         TIMESTAMPTZ   DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   DEFAULT NOW()
);

-- 3. Bids (Quotes)
CREATE TABLE IF NOT EXISTS bids (
  id          SERIAL PRIMARY KEY,
  rfq_id      INTEGER       REFERENCES rfq(id) ON DELETE CASCADE,
  user_id     INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  bid_amount  NUMERIC(12,2) NOT NULL,
  validity    VARCHAR(100),
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- 4. Audit Log
CREATE TABLE IF NOT EXISTS rfq_audit (
  id                SERIAL PRIMARY KEY,
  rfq_id            INTEGER     REFERENCES rfq(id) ON DELETE CASCADE,
  action            TEXT,
  old_bid_close_time TIMESTAMPTZ,
  new_bid_close_time TIMESTAMPTZ,
  changed_by        VARCHAR(255),
  changed_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes for performance ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rfq_created_by   ON rfq(created_by);
CREATE INDEX IF NOT EXISTS idx_bids_rfq_id      ON bids(rfq_id);
CREATE INDEX IF NOT EXISTS idx_bids_user_id     ON bids(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_rfq_id     ON rfq_audit(rfq_id);
