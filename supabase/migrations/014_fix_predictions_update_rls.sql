-- Fix predictions UPDATE policy so the fallback submit flow can set is_locked = true.
--
-- Problem: PostgreSQL reuses the USING expression as WITH CHECK when no explicit
-- WITH CHECK is provided. The USING clause requires `is_locked = false`, but
-- locking a prediction sets is_locked = true on the resulting row, causing
-- "new row violates row-level security policy for table predictions".
--
-- Fix: keep the USING restriction (only edit currently-unlocked rows) but relax
-- the WITH CHECK so the resulting row can have any is_locked value.
--
-- Lock rule (migration 016 extends this): predictions are editable only while
-- no match is live or finished. Once any match starts, all predictions lock.

DROP POLICY IF EXISTS "predictions_update_own_unlocked" ON predictions;

CREATE POLICY "predictions_update_own_unlocked" ON predictions FOR UPDATE
  USING (
    user_id = auth.uid()
    AND is_locked = false
    AND NOT EXISTS (SELECT 1 FROM matches WHERE status IN ('live', 'finished'))
  )
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM matches WHERE status IN ('live', 'finished'))
  );
