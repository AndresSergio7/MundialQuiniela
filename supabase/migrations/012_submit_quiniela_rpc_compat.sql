-- Ensure submit_quiniela exists in all environments and add a
-- compatibility overload for parameter order expected by some
-- PostgREST schema-cache states.

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

  INSERT INTO submissions (
    pool_id,
    user_id,
    submitted_at,
    is_valid,
    validation_errors,
    is_final,
    locked_at
  )
  VALUES (
    p_pool_id,
    v_user,
    v_now,
    p_is_valid,
    COALESCE(p_errors, '[]'::jsonb),
    p_is_valid,
    CASE WHEN p_is_valid THEN v_now END
  )
  ON CONFLICT (pool_id, user_id) DO UPDATE SET
    submitted_at      = v_now,
    is_valid          = EXCLUDED.is_valid,
    validation_errors = EXCLUDED.validation_errors,
    is_final          = EXCLUDED.is_final,
    locked_at         = EXCLUDED.locked_at;

  IF p_is_valid THEN
    UPDATE predictions
       SET is_locked = true,
           updated_at = v_now
     WHERE pool_id = p_pool_id AND user_id = v_user;
  END IF;

  INSERT INTO standings (
    pool_id,
    user_id,
    total_points,
    exact_scores,
    correct_results,
    matches_played
  )
  VALUES (p_pool_id, v_user, 0, 0, 0, 0)
  ON CONFLICT (pool_id, user_id) DO UPDATE SET
    updated_at = v_now;

  RETURN jsonb_build_object(
    'success', p_is_valid,
    'error',   CASE WHEN p_is_valid THEN NULL ELSE 'Validation failed.' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Compatibility overload: same argument names/types but order matching
-- the RPC lookup from some clients/schema cache states.
DROP FUNCTION IF EXISTS submit_quiniela(JSONB, BOOLEAN, UUID);

CREATE FUNCTION submit_quiniela(
  p_errors JSONB,
  p_is_valid BOOLEAN,
  p_pool_id UUID
)
RETURNS JSONB AS $$
  SELECT submit_quiniela(p_pool_id, p_is_valid, p_errors);
$$ LANGUAGE SQL SECURITY DEFINER;
