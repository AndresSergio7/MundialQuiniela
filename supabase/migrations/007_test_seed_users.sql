-- ============================================================
-- TEST UTILITY: seed fake users bypassing auth.users FK
-- Inserts fake rows into auth.users + profiles + pool_members
-- in a single SECURITY DEFINER transaction.
-- ============================================================

CREATE OR REPLACE FUNCTION test_seed_fake_users(
  p_pool_id UUID,
  p_count   INT DEFAULT 2
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_pool         pools%ROWTYPE;
  v_current      INT;
  v_available    INT;
  v_to_insert    INT;
  v_pool_suffix  TEXT;
  v_fake_id      UUID;
  v_inserted     INT := 0;
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

  v_available  := v_pool.max_members - v_current;
  v_to_insert  := LEAST(p_count, v_available);

  IF v_to_insert <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Pool is full — no slots available for fake users'
    );
  END IF;

  -- Last 12 hex chars of pool_id for deterministic suffix
  v_pool_suffix := RIGHT(REPLACE(p_pool_id::TEXT, '-', ''), 12);

  FOR i IN 1..v_to_insert LOOP
    v_fake_id := (
      '00000000-0000-' ||
      LPAD(TO_HEX(i), 4, '0') ||
      '-0000-' ||
      v_pool_suffix
    )::UUID;

    -- Create the auth user (bypasses client RLS via SECURITY DEFINER)
    INSERT INTO auth.users (
      id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, role,
      aud
    )
    VALUES (
      v_fake_id,
      'test_' || i || '_' || v_pool_suffix || '@test.invalid',
      '',
      NOW(), NOW(), NOW(),
      'authenticated',
      'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Profile (FK now satisfied)
    INSERT INTO public.profiles (id, username, full_name)
    VALUES (v_fake_id, 'test_user_' || i, 'Test User ' || i)
    ON CONFLICT (id) DO NOTHING;

    -- Pool membership
    INSERT INTO public.pool_members (pool_id, user_id, role)
    VALUES (p_pool_id, v_fake_id, 'member')
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
