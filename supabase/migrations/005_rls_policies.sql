-- ============================================================
-- MUNDIAL QUINIELA — Row Level Security policies
-- ============================================================
-- All tables need RLS enabled + policies so Supabase clients can
-- read/write. SECURITY DEFINER RPCs bypass RLS for atomic ops.
-- ============================================================

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read any profile (needed for member name display)
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- The auth trigger (SECURITY DEFINER) handles INSERT on signup.
-- Allow the user to insert their own profile as a fallback.
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- POOLS
-- ============================================================
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;

-- Members can view pools they belong to
CREATE POLICY "pools_select_member" ON pools
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pool_members
      WHERE pool_id = pools.id AND user_id = auth.uid()
    )
  );

-- Any authenticated user can create a pool
CREATE POLICY "pools_insert_auth" ON pools
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND admin_id = auth.uid()
  );

-- Only the admin can update pool settings
CREATE POLICY "pools_update_admin" ON pools
  FOR UPDATE USING (admin_id = auth.uid());

-- Only the admin can delete their pool (direct path; RPC path also works)
CREATE POLICY "pools_delete_admin" ON pools
  FOR DELETE USING (admin_id = auth.uid());

-- ============================================================
-- POOL MEMBERS
-- ============================================================
ALTER TABLE pool_members ENABLE ROW LEVEL SECURITY;

-- Members can see other members of the same pool
CREATE POLICY "pool_members_select" ON pool_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pool_members pm2
      WHERE pm2.pool_id = pool_members.pool_id AND pm2.user_id = auth.uid()
    )
  );

-- Users can add themselves (join) or the admin can add anyone
CREATE POLICY "pool_members_insert" ON pool_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM pools
      WHERE id = pool_members.pool_id AND admin_id = auth.uid()
    )
  );

-- Admin can delete members; member can remove themselves
CREATE POLICY "pool_members_delete" ON pool_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM pools
      WHERE id = pool_members.pool_id AND admin_id = auth.uid()
    )
  );

-- ============================================================
-- MATCHES
-- ============================================================
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read match data
CREATE POLICY "matches_select" ON matches
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- PREDICTIONS
-- ============================================================
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Pool members can read all predictions in their pool
CREATE POLICY "predictions_select" ON predictions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pool_members
      WHERE pool_id = predictions.pool_id AND user_id = auth.uid()
    )
  );

-- Users can insert their own predictions
CREATE POLICY "predictions_insert_own" ON predictions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update only their own unlocked predictions
CREATE POLICY "predictions_update_own" ON predictions
  FOR UPDATE USING (user_id = auth.uid() AND is_locked = false);

-- ============================================================
-- SUBMISSIONS
-- ============================================================
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Pool members can see submissions of all members in their pool
CREATE POLICY "submissions_select" ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pool_members
      WHERE pool_id = submissions.pool_id AND user_id = auth.uid()
    )
  );

-- Users can insert their own submission
CREATE POLICY "submissions_insert_own" ON submissions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own submission (save draft / final submit)
CREATE POLICY "submissions_update_own" ON submissions
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- STANDINGS
-- ============================================================
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;

-- Pool members can see standings
CREATE POLICY "standings_select" ON standings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pool_members
      WHERE pool_id = standings.pool_id AND user_id = auth.uid()
    )
  );

-- The recalculate_standings and submit_quiniela RPCs are
-- SECURITY DEFINER, so they bypass RLS for INSERT/UPDATE/DELETE.
-- Allow direct insert by the user too, as a fallback.
CREATE POLICY "standings_insert_own" ON standings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "standings_update_own" ON standings
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- PAYMENTS
-- ============================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own payments
CREATE POLICY "payments_select_own" ON payments
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own payment records
CREATE POLICY "payments_insert_own" ON payments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Verification is done by SECURITY DEFINER RPCs / Edge Functions.
-- Allow the user to update their own payment as a dev-fallback.
CREATE POLICY "payments_update_own" ON payments
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- ENTITLEMENTS
-- ============================================================
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

-- Users can only see their own entitlements
CREATE POLICY "entitlements_select_own" ON entitlements
  FOR SELECT USING (user_id = auth.uid());

-- grant_entitlement_from_payment RPC is SECURITY DEFINER so it handles
-- INSERT. Allow direct insert as a dev-fallback path.
CREATE POLICY "entitlements_insert_own" ON entitlements
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow user to update their own entitlement (consumed when creating pool)
CREATE POLICY "entitlements_update_own" ON entitlements
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- INVITES
-- ============================================================
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Pool admin / members can see invites for their pool
CREATE POLICY "invites_select" ON invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pool_members
      WHERE pool_id = invites.pool_id AND user_id = auth.uid()
    )
  );

-- Pool admin can create invites
CREATE POLICY "invites_insert_admin" ON invites
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Pool admin or the person who used the invite can update
CREATE POLICY "invites_update" ON invites
  FOR UPDATE USING (
    created_by = auth.uid() OR used_by = auth.uid()
  );

-- ============================================================
-- TOURNAMENT CONFIG (public read, no write from client)
-- ============================================================
ALTER TABLE tournament_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournament_config_select" ON tournament_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- Notify PostgREST to reload schema + policies
-- ============================================================
NOTIFY pgrst, 'reload schema';
