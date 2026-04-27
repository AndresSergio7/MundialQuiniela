-- 018: RPC to join a pool via invite link, bypassing RLS for the pool lookup.
--
-- Problem: pools_select_member policy requires the user to already be a member
-- to see the pool. A new invitee isn't a member yet, so the client-side
-- joinViaInvite() gets null for the pool → "Pool not found" error.
--
-- Fix: SECURITY DEFINER RPC that does the pool lookup internally (bypassing RLS),
-- validates the invite token, then inserts the pool_member row.

DROP FUNCTION IF EXISTS join_pool_via_invite(UUID, TEXT);

CREATE OR REPLACE FUNCTION join_pool_via_invite(
  p_pool_id UUID,
  p_token   TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user  UUID := auth.uid();
  v_pool  RECORD;
  v_count INT;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.');
  END IF;

  -- Bypass RLS: read pool with SECURITY DEFINER privileges
  SELECT invite_token, is_active, max_members
    INTO v_pool
    FROM pools
   WHERE id = p_pool_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pool not found.');
  END IF;

  IF v_pool.invite_token <> p_token THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invite token.');
  END IF;

  IF NOT v_pool.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pool is not active or does not exist.');
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM pool_members
   WHERE pool_id = p_pool_id;

  IF v_count >= v_pool.max_members THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pool is full.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM pool_members
     WHERE pool_id = p_pool_id AND user_id = v_user
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already a member of this pool.');
  END IF;

  INSERT INTO pool_members (pool_id, user_id, role)
  VALUES (p_pool_id, v_user, 'member');

  RETURN jsonb_build_object('success', true, 'error', null);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
