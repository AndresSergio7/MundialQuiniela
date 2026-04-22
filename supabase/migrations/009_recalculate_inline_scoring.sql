-- ============================================================
-- Fix: recalculate_standings — compute points inline
-- ------------------------------------------------------------
-- The original function reads predictions.points_earned which
-- is only populated by the sync-results Edge Function (scheduled).
-- This version computes the scoring formula directly from
-- predictions + matches, so it works without the Edge Function.
--
-- Scoring rules (mirrors sync-results/index.ts):
--   Exact score               → 6 pts
--   Correct draw, wrong score → 4 pts
--   Correct result + 1 goal   → 4 pts
--   Correct result only        → 3 pts
--   1 goal matches, wrong result → 1 pt
--   No match                   → 0 pts
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_standings(p_pool_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO standings (pool_id, user_id, total_points,
                         exact_scores, correct_results, matches_played)
  SELECT
    p.pool_id,
    p.user_id,
    COALESCE(SUM(
      CASE
        WHEN m.status <> 'finished'
          OR m.home_score IS NULL
          OR m.away_score IS NULL
        THEN 0

        -- Exact score
        WHEN p.home_score = m.home_score
         AND p.away_score = m.away_score
        THEN 6

        -- Correct draw, wrong score
        WHEN SIGN(p.home_score - p.away_score) = 0
         AND SIGN(m.home_score - m.away_score) = 0
        THEN 4

        -- Correct result + one goal matches
        WHEN SIGN(p.home_score - p.away_score) = SIGN(m.home_score - m.away_score)
         AND (p.home_score = m.home_score OR p.away_score = m.away_score)
        THEN 4

        -- Correct result only
        WHEN SIGN(p.home_score - p.away_score) = SIGN(m.home_score - m.away_score)
        THEN 3

        -- One goal matches, wrong result
        WHEN p.home_score = m.home_score OR p.away_score = m.away_score
        THEN 1

        ELSE 0
      END
    ), 0)                                                    AS total_points,

    COUNT(*) FILTER (
      WHERE m.status = 'finished'
        AND p.home_score = m.home_score
        AND p.away_score = m.away_score
    )                                                        AS exact_scores,

    COUNT(*) FILTER (
      WHERE m.status = 'finished'
        AND m.home_score IS NOT NULL
        AND SIGN(p.home_score - p.away_score) = SIGN(m.home_score - m.away_score)
    )                                                        AS correct_results,

    COUNT(*) FILTER (
      WHERE m.status = 'finished'
    )                                                        AS matches_played

  FROM predictions p
  JOIN matches m ON m.id = p.match_id
  JOIN submissions s ON s.pool_id = p.pool_id
                    AND s.user_id = p.user_id
                    AND s.is_valid = true
  WHERE p.pool_id = p_pool_id
  GROUP BY p.pool_id, p.user_id
  ON CONFLICT (pool_id, user_id) DO UPDATE SET
    total_points    = EXCLUDED.total_points,
    exact_scores    = EXCLUDED.exact_scores,
    correct_results = EXCLUDED.correct_results,
    matches_played  = EXCLUDED.matches_played,
    updated_at      = NOW();

  -- Ranks: tie-break on exact scores then correct results
  WITH ranked AS (
    SELECT id,
      RANK() OVER (
        PARTITION BY pool_id
        ORDER BY total_points DESC, exact_scores DESC, correct_results DESC
      ) AS r
    FROM standings
    WHERE pool_id = p_pool_id
  )
  UPDATE standings s
     SET rank = ranked.r
    FROM ranked
   WHERE s.id = ranked.id;

  -- Drop stale standings for users who never submitted
  DELETE FROM standings
  WHERE pool_id = p_pool_id
    AND user_id NOT IN (
      SELECT user_id FROM submissions
      WHERE pool_id = p_pool_id AND is_valid = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
