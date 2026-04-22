-- ============================================================
-- TEST UTILITY: full seed in one transaction
-- Seeds fake auth users + profiles + pool_members +
-- predictions + submissions for a given pool.
-- SECURITY DEFINER so it can write to auth.users.
-- ============================================================

CREATE OR REPLACE FUNCTION test_seed_and_submit(
  p_pool_id UUID,
  p_count   INT DEFAULT 2
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_pool        pools%ROWTYPE;
  v_current     INT;
  v_available   INT;
  v_to_insert   INT;
  v_pool_suffix TEXT;
  v_fake_id     UUID;
  v_match       RECORD;
  v_scores      INT[][] := ARRAY[
    ARRAY[1,0], ARRAY[2,1], ARRAY[0,0], ARRAY[2,2],
    ARRAY[1,1], ARRAY[3,1], ARRAY[0,1], ARRAY[1,2],
    ARRAY[2,0], ARRAY[1,3]
  ];
  v_inserted    INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_pool FROM public.pools WHERE id = p_pool_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Pool not found');
  END IF;

  SELECT COUNT(*) INTO v_current
    FROM public.pool_members WHERE pool_id = p_pool_id;

  v_available := v_pool.max_members - v_current;
  v_to_insert := LEAST(p_count, v_available);

  IF v_to_insert <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Pool is full — no slots available for fake users'
    );
  END IF;

  v_pool_suffix := RIGHT(REPLACE(p_pool_id::TEXT, '-', ''), 12);

  FOR i IN 1..v_to_insert LOOP
    v_fake_id := (
      '00000000-0000-' ||
      LPAD(TO_HEX(i), 4, '0') ||
      '-0000-' ||
      v_pool_suffix
    )::UUID;

    -- 1. Auth user
    INSERT INTO auth.users (
      id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, role, aud
    )
    VALUES (
      v_fake_id,
      'test_' || i || '_' || v_pool_suffix || '@test.invalid',
      '', NOW(), NOW(), NOW(), 'authenticated', 'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. Profile
    INSERT INTO public.profiles (id, username, full_name)
    VALUES (v_fake_id, 'test_user_' || i, 'Test User ' || i)
    ON CONFLICT (id) DO NOTHING;

    -- 3. Pool member
    INSERT INTO public.pool_members (pool_id, user_id, role)
    VALUES (p_pool_id, v_fake_id, 'member')
    ON CONFLICT (pool_id, user_id) DO NOTHING;

    -- 4. Predictions for all matches
    FOR v_match IN
      SELECT id, match_number FROM public.matches ORDER BY match_number
    LOOP
      INSERT INTO public.predictions (
        pool_id, user_id, match_id,
        home_score, away_score, is_locked
      )
      VALUES (
        p_pool_id, v_fake_id, v_match.id,
        v_scores[((v_match.match_number + i - 1) % 10) + 1][1],
        v_scores[((v_match.match_number + i - 1) % 10) + 1][2],
        false
      )
      ON CONFLICT (pool_id, user_id, match_id) DO NOTHING;
    END LOOP;

    -- 5. Submission (marked valid)
    INSERT INTO public.submissions (
      pool_id, user_id, submitted_at,
      is_valid, validation_errors
    )
    VALUES (
      p_pool_id, v_fake_id, NOW(), true, '{}'
    )
    ON CONFLICT (pool_id, user_id)
    DO UPDATE SET is_valid = true, submitted_at = NOW();

    -- 6. Initial standings row
    INSERT INTO public.standings (
      pool_id, user_id, total_points,
      exact_scores, correct_results, matches_played
    )
    VALUES (p_pool_id, v_fake_id, 0, 0, 0, 0)
    ON CONFLICT (pool_id, user_id) DO NOTHING;

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN json_build_object(
    'success',  true,
    'inserted', v_inserted,
    'error',    null
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
