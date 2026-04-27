-- Returns the latest submission for each of the given pool IDs for the
-- calling user.  Used by the home screen to show submission status badges.

CREATE OR REPLACE FUNCTION get_submissions_for_pools(p_pool_ids UUID[])
RETURNS SETOF submissions
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM submissions
  WHERE user_id = auth.uid()
    AND pool_id = ANY(p_pool_ids);
$$;
