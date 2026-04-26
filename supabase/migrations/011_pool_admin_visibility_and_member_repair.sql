-- ============================================================
-- Fix "quiniela en limbo": admin could not SELECT their own pool
-- if pool_members was missing (pools RLS only allowed members).
-- Also backfill admin row in pool_members for every pool.
-- ============================================================

-- Allow pool admin to read pools they own (even before member row exists)
DROP POLICY IF EXISTS "pools_select_member" ON pools;
DROP POLICY IF EXISTS "pools_select_member_or_owner" ON pools;

CREATE POLICY "pools_select_member_or_owner" ON pools
  FOR SELECT USING (
    admin_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM pool_members pm
      WHERE pm.pool_id = pools.id AND pm.user_id = auth.uid()
    )
  );

-- Ensure every pool admin is a member (fixes broken create / partial failures)
INSERT INTO pool_members (pool_id, user_id, role)
SELECT p.id, p.admin_id, 'admin'
FROM pools p
WHERE NOT EXISTS (
  SELECT 1 FROM pool_members pm
  WHERE pm.pool_id = p.id AND pm.user_id = p.admin_id
)
ON CONFLICT (pool_id, user_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
