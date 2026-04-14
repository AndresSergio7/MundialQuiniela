-- ============================================================
-- MUNDIAL QUINIELA - Initial Schema
-- FIFA World Cup 2026
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- POOLS
-- ============================================================
CREATE TABLE pools (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  admin_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  invite_token    TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  prediction_deadline TIMESTAMPTZ NOT NULL DEFAULT '2026-06-11 18:00:00+00',
  max_members     INT NOT NULL DEFAULT 10,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- POOL MEMBERS
-- ============================================================
CREATE TABLE pool_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id     UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pool_id, user_id)
);

-- ============================================================
-- INVITES
-- ============================================================
CREATE TABLE invites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id     UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  used_by     UUID REFERENCES profiles(id),
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MATCHES (72 Group Stage)
-- ============================================================
CREATE TABLE matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_number    INT UNIQUE NOT NULL,
  group_name      TEXT NOT NULL,
  home_team       TEXT NOT NULL,
  away_team       TEXT NOT NULL,
  home_team_code  TEXT NOT NULL,
  away_team_code  TEXT NOT NULL,
  match_date      TIMESTAMPTZ NOT NULL,
  venue           TEXT NOT NULL,
  city            TEXT NOT NULL,
  home_score      INT,
  away_score      INT,
  status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished', 'postponed')),
  external_id     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PREDICTIONS
-- ============================================================
CREATE TABLE predictions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id         UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  home_score      INT NOT NULL CHECK (home_score >= 0),
  away_score      INT NOT NULL CHECK (away_score >= 0),
  points_earned   INT DEFAULT 0,
  is_locked       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pool_id, user_id, match_id)
);

-- ============================================================
-- SUBMISSIONS
-- ============================================================
CREATE TABLE submissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id         UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  is_valid        BOOLEAN NOT NULL DEFAULT false,
  validation_errors JSONB DEFAULT '[]',
  locked_at       TIMESTAMPTZ,
  UNIQUE(pool_id, user_id)
);

-- ============================================================
-- STANDINGS
-- ============================================================
CREATE TABLE standings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id         UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_points    INT NOT NULL DEFAULT 0,
  exact_scores    INT NOT NULL DEFAULT 0,
  correct_results INT NOT NULL DEFAULT 0,
  matches_played  INT NOT NULL DEFAULT 0,
  rank            INT,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pool_id, user_id)
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  pool_id         UUID REFERENCES pools(id),
  amount_cents    INT NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'USD',
  platform        TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  product_id      TEXT NOT NULL,
  transaction_id  TEXT UNIQUE NOT NULL,
  receipt_data    TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'refunded')),
  payment_type    TEXT NOT NULL CHECK (payment_type IN ('app_access', 'extra_slots')),
  slots_purchased INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  verified_at     TIMESTAMPTZ
);

-- ============================================================
-- ENTITLEMENTS
-- ============================================================
CREATE TABLE entitlements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pool_id         UUID REFERENCES pools(id) ON DELETE CASCADE,
  has_app_access  BOOLEAN NOT NULL DEFAULT false,
  base_slots      INT NOT NULL DEFAULT 10,
  extra_slots     INT NOT NULL DEFAULT 0,
  total_slots     INT GENERATED ALWAYS AS (base_slots + extra_slots) STORED,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pool_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_pool_members_pool_id ON pool_members(pool_id);
CREATE INDEX idx_pool_members_user_id ON pool_members(user_id);
CREATE INDEX idx_predictions_pool_user ON predictions(pool_id, user_id);
CREATE INDEX idx_predictions_match_id ON predictions(match_id);
CREATE INDEX idx_standings_pool_id ON standings(pool_id);
CREATE INDEX idx_standings_total_points ON standings(pool_id, total_points DESC);
CREATE INDEX idx_matches_group ON matches(group_name);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_invites_token ON invites(token);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at      BEFORE UPDATE ON profiles      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pools_updated_at         BEFORE UPDATE ON pools         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_matches_updated_at       BEFORE UPDATE ON matches       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_predictions_updated_at   BEFORE UPDATE ON predictions   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_entitlements_updated_at  BEFORE UPDATE ON entitlements  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- STANDINGS UPSERT FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_standings(p_pool_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO standings (pool_id, user_id, total_points, exact_scores, correct_results, matches_played)
  SELECT
    p.pool_id,
    p.user_id,
    COALESCE(SUM(p.points_earned), 0) AS total_points,
    COUNT(*) FILTER (WHERE p.points_earned = 6) AS exact_scores,
    COUNT(*) FILTER (WHERE p.points_earned >= 3) AS correct_results,
    COUNT(*) FILTER (WHERE m.status = 'finished') AS matches_played
  FROM predictions p
  JOIN matches m ON m.id = p.match_id
  WHERE p.pool_id = p_pool_id
  GROUP BY p.pool_id, p.user_id
  ON CONFLICT (pool_id, user_id)
  DO UPDATE SET
    total_points    = EXCLUDED.total_points,
    exact_scores    = EXCLUDED.exact_scores,
    correct_results = EXCLUDED.correct_results,
    matches_played  = EXCLUDED.matches_played,
    updated_at      = NOW();

  -- Assign ranks
  WITH ranked AS (
    SELECT id,
      RANK() OVER (PARTITION BY pool_id ORDER BY total_points DESC, exact_scores DESC) AS r
    FROM standings
    WHERE pool_id = p_pool_id
  )
  UPDATE standings s
  SET rank = ranked.r
  FROM ranked
  WHERE s.id = ranked.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
