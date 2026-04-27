-- 017: Allow editing predictions after submit; add is_paid to members; add notes to pools.
--
-- 1. Remove is_locked guard from predictions UPDATE so users can re-edit after submit.
-- 2. Update submit_quiniela RPC to no longer lock individual predictions.
-- 3. Add is_paid flag to pool_members (admin manages).
-- 4. Add notes column to pools (admin manages).
-- 5. Allow pool members to SELECT each other's predictions once tournament has started.
-- 6. Allow admin to UPDATE is_paid on pool_members.

-- ── 1. Relax predictions UPDATE policy ──────────────────────────────────────
DROP POLICY IF EXISTS "predictions_update_own_unlocked" ON predictions;

CREATE POLICY "predictions_update_own_unlocked" ON predictions FOR UPDATE
  USING (
    user_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM matches WHERE status IN ('live', 'finished'))
  )
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM matches WHERE status IN ('live', 'finished'))
  );

-- ── 2. Update submit_quiniela RPC ────────────────────────────────────────────
-- Predictions are no longer locked on submit — they stay editable until the
-- tournament starts. The submission (is_final) records the commitment.
DROP FUNCTION IF EXISTS submit_quiniela(UUID, BOOLEAN, JSONB);
DROP FUNCTION IF EXISTS submit_quiniela(JSONB, BOOLEAN, UUID);

CREATE OR REPLACE FUNCTION submit_quiniela(
  p_pool_id UUID,
  p_is_valid BOOLEAN,
  p_errors  JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_user UUID := auth.uid();
  v_now  TIMESTAMPTZ := NOW();
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pools WHERE id = p_pool_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pool not found.');
  END IF;

  IF EXISTS (SELECT 1 FROM matches WHERE status IN ('live', 'finished')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'El torneo ya comenzó. No se puede enviar la quiniela.');
  END IF;

  INSERT INTO submissions (
    pool_id, user_id, submitted_at,
    is_valid, validation_errors,
    is_final, locked_at
  )
  VALUES (
    p_pool_id, v_user, v_now,
    p_is_valid, COALESCE(p_errors, '[]'::jsonb),
    p_is_valid, CASE WHEN p_is_valid THEN v_now END
  )
  ON CONFLICT (pool_id, user_id) DO UPDATE SET
    submitted_at      = v_now,
    is_valid          = EXCLUDED.is_valid,
    validation_errors = EXCLUDED.validation_errors,
    is_final          = EXCLUDED.is_final,
    locked_at         = EXCLUDED.locked_at;

  -- Intentionally NOT locking predictions here so users can re-edit after submit.

  INSERT INTO standings (
    pool_id, user_id, total_points,
    exact_scores, correct_results, matches_played
  )
  VALUES (p_pool_id, v_user, 0, 0, 0, 0)
  ON CONFLICT (pool_id, user_id) DO UPDATE SET updated_at = v_now;

  RETURN jsonb_build_object(
    'success', p_is_valid,
    'error',   CASE WHEN p_is_valid THEN NULL ELSE 'Validation failed.' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION submit_quiniela(
  p_errors  JSONB,
  p_is_valid BOOLEAN,
  p_pool_id UUID
)
RETURNS JSONB AS $$
  SELECT submit_quiniela(p_pool_id, p_is_valid, p_errors);
$$ LANGUAGE SQL SECURITY DEFINER;

-- ── 3. Add is_paid to pool_members ──────────────────────────────────────────
ALTER TABLE pool_members
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE;

-- Pool admin can update is_paid for members in their pools
DROP POLICY IF EXISTS "pool_members_admin_update_paid" ON pool_members;

CREATE POLICY "pool_members_admin_update_paid" ON pool_members FOR UPDATE
  USING (
    pool_id IN (SELECT id FROM pools WHERE admin_id = auth.uid())
  )
  WITH CHECK (
    pool_id IN (SELECT id FROM pools WHERE admin_id = auth.uid())
  );

-- ── 4. Add notes to pools ────────────────────────────────────────────────────
ALTER TABLE pools
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── 5. Allow pool members to see each other's predictions after tournament starts
DROP POLICY IF EXISTS "predictions_select_members_after_start" ON predictions;

CREATE POLICY "predictions_select_members_after_start" ON predictions FOR SELECT
  USING (
    pool_id IN (SELECT pool_id FROM pool_members WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM matches WHERE status IN ('live', 'finished'))
  );

-- ── 6. Allow pool admin to read is_paid on pool_members ──────────────────────
-- (members can already SELECT via existing policy; this ensures is_paid is visible)
