-- ============================================================
-- MUNDIAL QUINIELA - User profile + payment methods metadata
-- ------------------------------------------------------------
-- Security note:
-- This table stores only non-sensitive metadata (brand/last4/exp).
-- Never store full PAN, CVV, or raw card data.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_payment_methods (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider                    TEXT NOT NULL DEFAULT 'manual_tokenized',
  provider_customer_id        TEXT,
  provider_payment_method_id  TEXT,
  card_brand                  TEXT NOT NULL,
  card_last4                  TEXT NOT NULL CHECK (card_last4 ~ '^[0-9]{4}$'),
  exp_month                   SMALLINT NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
  exp_year                    SMALLINT NOT NULL CHECK (exp_year >= 2024),
  holder_name                 TEXT,
  is_default                  BOOLEAN NOT NULL DEFAULT false,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_payment_methods_user_id
  ON user_payment_methods(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_payment_methods_default_per_user
  ON user_payment_methods(user_id)
  WHERE is_default = true;

CREATE TRIGGER trg_user_payment_methods_updated_at
  BEFORE UPDATE ON user_payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE user_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_payment_methods_select_own" ON user_payment_methods
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_payment_methods_insert_own" ON user_payment_methods
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_payment_methods_update_own" ON user_payment_methods
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "user_payment_methods_delete_own" ON user_payment_methods
  FOR DELETE USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
