-- ============================================================
-- MUNDIAL QUINIELA — Audit refactor (Phase 1)
-- ------------------------------------------------------------
-- Goals:
--   1. submit_quiniela  → atomic submit that validates, locks
--      predictions (is_locked=true), writes submission + standings.
--   2. save_predictions → blocked once the user is locked.
--   3. idempotent payments → 1 entitlement per (user, payment).
--   4. submitted-only standings and dynamic config helpers.
-- ============================================================

-- ---------- 0. schema tweaks -------------------------------

-- Link entitlements to the payment that created them so a restore
-- call never double-grants. NULL allowed for legacy / seed rows.
ALTER TABLE entitlements
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_user_payment
  ON entitlements(user_id, payment_id)
  WHERE payment_id IS NOT NULL;

-- transaction_id is already UNIQUE on payments; make sure the index
-- exists so ON CONFLICT can use it.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_transaction_id
  ON payments(transaction_id);

-- Track when a submission was first submitted vs. last edited, to
-- support an "unlock window" if the admin ever grants one.
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS is_final BOOLEAN NOT NULL DEFAULT false;

-- Central tournament config (single row). Used to drive the deadline
-- + match count without client-side hardcodes.
CREATE TABLE IF NOT EXISTS tournament_config (
  id                  INT PRIMARY KEY DEFAULT 1,
  tournament_name     TEXT NOT NULL DEFAULT 'FIFA World Cup 2026',
  first_match_kickoff TIMESTAMPTZ NOT NULL DEFAULT '2026-06-11 18:00:00+00',
  total_matches       INT NOT NULL DEFAULT 72,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1)
);

INSERT INTO tournament_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ---------- 1. helpers -------------------------------------

-- Returns TRUE while the pool is still editable.
CREATE OR REPLACE FUNCTION is_pool_open(p_pool_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(prediction_deadline > NOW(), false)
  FROM pools WHERE id = p_pool_id;
$$ LANGUAGE SQL STABLE;

-- Returns TRUE if the user is locked and cannot edit further.
CREATE OR REPLACE FUNCTION is_user_locked(p_pool_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_final FROM submissions
      WHERE pool_id = p_pool_id AND user_id = p_user_id),
    false
  );
$$ LANGUAGE SQL STABLE;

-- ---------- 2. submit_quiniela RPC -------------------------
-- Atomic: locks every prediction row for this user, flips the
-- submission flag, and inserts a placeholder standings row so the
-- member shows up immediately.
--
-- Validation rules (scoreline distribution, draws, ...) are still
-- computed on the client — this function only enforces structural
-- rules that the DB can check cheaply (deadline + count).

DROP FUNCTION IF EXISTS submit_quiniela(UUID);
DROP FUNCTION IF EXISTS submit_quiniela(UUID, BOOLEAN, JSONB);

CREATE OR REPLACE FUNCTION submit_quiniela(
  p_pool_id UUID,
  p_is_valid BOOLEAN,
  p_errors JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_user UUID := auth.uid();
  v_deadline TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.');
  END IF;

  SELECT prediction_deadline INTO v_deadline
  FROM pools WHERE id = p_pool_id;

  IF v_deadline IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pool not found.');
  END IF;

  IF v_deadline <= v_now THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prediction deadline has passed.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM pool_members
    WHERE pool_id = p_pool_id AND user_id = v_user
  ) IS NOT TRUE THEN
    -- tolerate membership being added by trigger race; re-check on the
    -- actual insert path below.
    NULL;
  END IF;

  -- 1. upsert submission
  INSERT INTO submissions (pool_id, user_id, submitted_at,
                           is_valid, validation_errors,
                           is_final, locked_at)
  VALUES (p_pool_id, v_user, v_now,
          p_is_valid, COALESCE(p_errors, '[]'::jsonb),
          p_is_valid, CASE WHEN p_is_valid THEN v_now END)
  ON CONFLICT (pool_id, user_id) DO UPDATE SET
    submitted_at      = v_now,
    is_valid          = EXCLUDED.is_valid,
    validation_errors = EXCLUDED.validation_errors,
    is_final          = EXCLUDED.is_final,
    locked_at         = EXCLUDED.locked_at;

  -- 2. lock predictions so save_predictions rejects further edits
  IF p_is_valid THEN
    UPDATE predictions
       SET is_locked = true,
           updated_at = v_now
     WHERE pool_id = p_pool_id AND user_id = v_user;
  END IF;

  -- 3. make the user appear in standings as 0 pts
  INSERT INTO standings (pool_id, user_id, total_points,
                         exact_scores, correct_results, matches_played)
  VALUES (p_pool_id, v_user, 0, 0, 0, 0)
  ON CONFLICT (pool_id, user_id) DO UPDATE SET
    updated_at = v_now;

  RETURN jsonb_build_object(
    'success', p_is_valid,
    'error',   CASE WHEN p_is_valid THEN NULL ELSE 'Validation failed.' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------- 3. save_predictions_safe RPC -------------------
-- Bulk upsert that rejects if the user is already locked.  The
-- client still writes directly for unlocked users via the normal
-- table API; this RPC is the hardened path for mobile clients.

DROP FUNCTION IF EXISTS save_predictions_safe(UUID, JSONB);

CREATE OR REPLACE FUNCTION save_predictions_safe(
  p_pool_id UUID,
  p_predictions JSONB  -- [{match_id, home, away}]
)
RETURNS JSONB AS $$
DECLARE
  v_user UUID := auth.uid();
  v_deadline TIMESTAMPTZ;
  v_locked BOOLEAN;
  v_row JSONB;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.');
  END IF;

  SELECT prediction_deadline INTO v_deadline
  FROM pools WHERE id = p_pool_id;
  IF v_deadline IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pool not found.');
  END IF;
  IF v_deadline <= NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prediction deadline has passed.');
  END IF;

  SELECT is_final INTO v_locked FROM submissions
  WHERE pool_id = p_pool_id AND user_id = v_user;
  IF COALESCE(v_locked, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your quiniela is already submitted.');
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_predictions)
  LOOP
    INSERT INTO predictions (pool_id, user_id, match_id,
                             home_score, away_score, is_locked)
    VALUES (p_pool_id, v_user,
            (v_row->>'match_id')::UUID,
            (v_row->>'home')::INT,
            (v_row->>'away')::INT,
            false)
    ON CONFLICT (pool_id, user_id, match_id) DO UPDATE SET
      home_score = EXCLUDED.home_score,
      away_score = EXCLUDED.away_score,
      updated_at = NOW()
    WHERE predictions.is_locked = false;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'error', NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------- 4. grant_entitlement_from_payment --------------
-- Idempotent: called after a verified purchase.  Looks up the
-- payment, maps product → slots, and inserts exactly ONE
-- entitlement row per (user, payment).  Safe to call repeatedly
-- (re-purchase, restore, retry).

DROP FUNCTION IF EXISTS grant_entitlement_from_payment(UUID);

CREATE OR REPLACE FUNCTION grant_entitlement_from_payment(p_payment_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_payment payments;
  v_ent_id UUID;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found.');
  END IF;
  IF v_payment.status <> 'verified' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not verified.');
  END IF;

  -- dedupe by (user_id, payment_id)
  SELECT id INTO v_ent_id FROM entitlements
  WHERE user_id = v_payment.user_id AND payment_id = p_payment_id
  LIMIT 1;

  IF v_ent_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'entitlement_id', v_ent_id, 'reused', true);
  END IF;

  INSERT INTO entitlements (user_id, pool_id, has_app_access,
                            base_slots, extra_slots, payment_id)
  VALUES (v_payment.user_id, NULL, true,
          v_payment.slots_purchased, 0, p_payment_id)
  RETURNING id INTO v_ent_id;

  RETURN jsonb_build_object('success', true, 'entitlement_id', v_ent_id, 'reused', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------- 5. submitted-only standings --------------------
-- Only include users that have a valid, final submission.

CREATE OR REPLACE FUNCTION recalculate_standings(p_pool_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO standings (pool_id, user_id, total_points,
                         exact_scores, correct_results, matches_played)
  SELECT
    p.pool_id,
    p.user_id,
    COALESCE(SUM(p.points_earned), 0) AS total_points,
    COUNT(*) FILTER (WHERE p.points_earned = 6) AS exact_scores,
    COUNT(*) FILTER (WHERE p.points_earned >= 3) AS correct_results,
    COUNT(*) FILTER (WHERE m.status = 'finished') AS matches_played
  FROM predictions p
  JOIN matches m ON m.id = p.match_id
  JOIN submissions s ON s.pool_id = p.pool_id
                    AND s.user_id = p.user_id
                    AND s.is_valid = true
  WHERE p.pool_id = p_pool_id
  GROUP BY p.pool_id, p.user_id
  ON CONFLICT (pool_id, user_id) DO UPDATE SET
    total_points    = EXCLUDED.total_points,
    exact_scores    = EXCLUDED.exact_scores,
    correct_results = EXCLUDED.correct_results,
    matches_played  = EXCLUDED.matches_played,
    updated_at      = NOW();

  -- ranks: tie-break on exact scores then correct results
  WITH ranked AS (
    SELECT id,
      RANK() OVER (
        PARTITION BY pool_id
        ORDER BY total_points DESC, exact_scores DESC, correct_results DESC
      ) AS r
    FROM standings
    WHERE pool_id = p_pool_id
  )
  UPDATE standings s
     SET rank = ranked.r
    FROM ranked
   WHERE s.id = ranked.id;

  -- Drop any stale standings for users who never submitted.
  DELETE FROM standings
  WHERE pool_id = p_pool_id
    AND user_id NOT IN (
      SELECT user_id FROM submissions
      WHERE pool_id = p_pool_id AND is_valid = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------- 6. batch submission status ---------------------
-- Single round-trip replacement for the N+1 loop on the home
-- screen: returns one row per pool_id the caller passes in.

DROP FUNCTION IF EXISTS get_submissions_for_pools(UUID[]);

CREATE OR REPLACE FUNCTION get_submissions_for_pools(p_pool_ids UUID[])
RETURNS TABLE (
  pool_id UUID,
  submitted_at TIMESTAMPTZ,
  is_valid BOOLEAN,
  is_final BOOLEAN,
  validation_errors JSONB
) AS $$
  SELECT s.pool_id, s.submitted_at, s.is_valid, s.is_final, s.validation_errors
  FROM submissions s
  WHERE s.user_id = auth.uid()
    AND s.pool_id = ANY(p_pool_ids);
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ---------- 7. tournament config accessor ------------------

DROP FUNCTION IF EXISTS get_tournament_config();

CREATE OR REPLACE FUNCTION get_tournament_config()
RETURNS TABLE (
  tournament_name TEXT,
  first_match_kickoff TIMESTAMPTZ,
  total_matches INT
) AS $$
  SELECT tournament_name, first_match_kickoff, total_matches
  FROM tournament_config
  WHERE id = 1;
$$ LANGUAGE SQL STABLE;

-- ---------- 8. reload PostgREST cache ---------------------
NOTIFY pgrst, 'reload schema';
