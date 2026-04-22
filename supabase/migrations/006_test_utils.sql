-- ============================================================
-- TEST UTILITIES — SECURITY DEFINER RPCs
-- Only callable by authenticated users, bypass RLS for test ops.
-- ============================================================

-- Set a match result (used by debug screen / test mode only).
-- Bypasses the matches table RLS which has no UPDATE policy.
CREATE OR REPLACE FUNCTION test_set_match_result(
  p_match_id  UUID,
  p_home_score INT,
  p_away_score INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match matches%ROWTYPE;
BEGIN
  -- Basic auth guard — must be signed in
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate scores
  IF p_home_score < 0 OR p_home_score > 20 OR p_away_score < 0 OR p_away_score > 20 THEN
    RETURN json_build_object('success', false, 'error', 'Scores must be between 0 and 20');
  END IF;

  UPDATE matches
  SET
    home_score  = p_home_score,
    away_score  = p_away_score,
    status      = 'finished',
    updated_at  = NOW()
  WHERE id = p_match_id
  RETURNING * INTO v_match;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Match not found');
  END IF;

  RETURN json_build_object(
    'success', true,
    'match', row_to_json(v_match)
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
