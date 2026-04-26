-- Ensure users can insert/update their own standings rows.
-- Some environments were missing these policies, which caused
-- fallback submit flow to fail with RLS errors.

ALTER TABLE standings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "standings_insert_own" ON standings;
CREATE POLICY "standings_insert_own" ON standings
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "standings_update_own" ON standings;
CREATE POLICY "standings_update_own" ON standings
  FOR UPDATE USING (user_id = auth.uid());
