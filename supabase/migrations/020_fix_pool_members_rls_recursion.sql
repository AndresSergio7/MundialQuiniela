-- ============================================================
-- Fix infinite recursion in pool_members RLS policies
-- ============================================================
-- Root cause: pool_members_select queries pool_members to check
-- membership, triggering itself recursively. All other policies
-- that check membership via pool_members also hit this chain.
--
-- Fix: a SECURITY DEFINER helper function that reads pool_members
-- without RLS enforcement, breaking the recursion cycle.
-- ============================================================

-- Helper: check if the current user is a member of a given pool.
-- SECURITY DEFINER = runs as function owner, bypassing RLS on pool_members.
CREATE OR REPLACE FUNCTION public.is_pool_member(pool_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pool_members
    WHERE pool_id = pool_uuid AND user_id = auth.uid()
  );
$$;

-- ---- pool_members -----------------------------------------------
DROP POLICY IF EXISTS "pool_members_select" ON pool_members;

CREATE POLICY "pool_members_select" ON pool_members
  FOR SELECT USING (
    public.is_pool_member(pool_members.pool_id)
  );

-- ---- pools ------------------------------------------------------
DROP POLICY IF EXISTS "pools_select_member" ON pools;

CREATE POLICY "pools_select_member" ON pools
  FOR SELECT USING (
    public.is_pool_member(pools.id)
  );

-- ---- predictions ------------------------------------------------
DROP POLICY IF EXISTS "predictions_select" ON predictions;

CREATE POLICY "predictions_select" ON predictions
  FOR SELECT USING (
    public.is_pool_member(predictions.pool_id)
  );

-- ---- submissions ------------------------------------------------
DROP POLICY IF EXISTS "submissions_select" ON submissions;

CREATE POLICY "submissions_select" ON submissions
  FOR SELECT USING (
    public.is_pool_member(submissions.pool_id)
  );

-- ---- standings --------------------------------------------------
DROP POLICY IF EXISTS "standings_select" ON standings;

CREATE POLICY "standings_select" ON standings
  FOR SELECT USING (
    public.is_pool_member(standings.pool_id)
  );

-- ---- invites ----------------------------------------------------
DROP POLICY IF EXISTS "invites_select" ON invites;

CREATE POLICY "invites_select" ON invites
  FOR SELECT USING (
    public.is_pool_member(invites.pool_id)
  );

-- Notify PostgREST to reload schema + policies
NOTIFY pgrst, 'reload schema';
