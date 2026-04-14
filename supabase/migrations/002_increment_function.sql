-- Helper function for incrementing values
CREATE OR REPLACE FUNCTION increment(x INT)
RETURNS INT AS $$
  SELECT x + 1;
$$ LANGUAGE SQL IMMUTABLE;

-- Locking function for scheduled jobs
CREATE OR REPLACE FUNCTION lock_predictions_for_pool(p_pool_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE predictions
  SET is_locked = true
  WHERE pool_id = p_pool_id;

  UPDATE submissions
  SET locked_at = NOW()
  WHERE pool_id = p_pool_id
    AND locked_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cron job setup (requires pg_cron extension)
-- SELECT cron.schedule(
--   'lock-predictions',
--   '0 18 11 6 *',  -- June 11, 2026 18:00 UTC
--   $$ SELECT lock_predictions_for_pool(id) FROM pools WHERE is_active = true $$
-- );
