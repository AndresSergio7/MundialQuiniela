-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlements   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "profiles_select_own"    ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own"    ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_select_public" ON profiles FOR SELECT USING (true);

-- ============================================================
-- POOLS
-- ============================================================
CREATE POLICY "pools_select_member" ON pools FOR SELECT
  USING (
    id IN (SELECT pool_id FROM pool_members WHERE user_id = auth.uid())
  );

CREATE POLICY "pools_insert_authenticated" ON pools FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "pools_update_admin" ON pools FOR UPDATE
  USING (admin_id = auth.uid());

-- ============================================================
-- POOL MEMBERS
-- ============================================================
CREATE POLICY "pool_members_select_member" ON pool_members FOR SELECT
  USING (
    pool_id IN (SELECT pool_id FROM pool_members WHERE user_id = auth.uid())
  );

CREATE POLICY "pool_members_insert_self" ON pool_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "pool_members_delete_admin" ON pool_members FOR DELETE
  USING (
    pool_id IN (SELECT id FROM pools WHERE admin_id = auth.uid())
    OR user_id = auth.uid()
  );

-- ============================================================
-- INVITES
-- ============================================================
CREATE POLICY "invites_select_pool_member" ON invites FOR SELECT
  USING (
    pool_id IN (SELECT pool_id FROM pool_members WHERE user_id = auth.uid())
    OR used_by = auth.uid()
  );

CREATE POLICY "invites_insert_admin" ON invites FOR INSERT
  WITH CHECK (
    pool_id IN (SELECT id FROM pools WHERE admin_id = auth.uid())
  );

CREATE POLICY "invites_update_join" ON invites FOR UPDATE
  USING (used_by IS NULL AND expires_at > NOW());

-- ============================================================
-- MATCHES (public read, admin write via service role)
-- ============================================================
CREATE POLICY "matches_select_all" ON matches FOR SELECT USING (true);

-- ============================================================
-- PREDICTIONS
-- ============================================================
CREATE POLICY "predictions_select_pool" ON predictions FOR SELECT
  USING (
    pool_id IN (SELECT pool_id FROM pool_members WHERE user_id = auth.uid())
  );

CREATE POLICY "predictions_insert_own" ON predictions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND pool_id IN (SELECT pool_id FROM pool_members WHERE user_id = auth.uid())
    AND is_locked = false
    AND (SELECT prediction_deadline FROM pools WHERE id = pool_id) > NOW()
  );

CREATE POLICY "predictions_update_own_unlocked" ON predictions FOR UPDATE
  USING (
    user_id = auth.uid()
    AND is_locked = false
    AND (SELECT prediction_deadline FROM pools WHERE id = pool_id) > NOW()
  );

-- ============================================================
-- SUBMISSIONS
-- ============================================================
CREATE POLICY "submissions_select_own" ON submissions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "submissions_insert_own" ON submissions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "submissions_update_own" ON submissions FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================
-- STANDINGS (pool members can see pool standings)
-- ============================================================
CREATE POLICY "standings_select_pool" ON standings FOR SELECT
  USING (
    pool_id IN (SELECT pool_id FROM pool_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE POLICY "payments_select_own" ON payments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "payments_insert_own" ON payments FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- ENTITLEMENTS
-- ============================================================
CREATE POLICY "entitlements_select_own" ON entitlements FOR SELECT
  USING (user_id = auth.uid());
