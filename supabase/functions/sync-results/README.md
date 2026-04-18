# sync-results

Scheduled Edge Function. Pulls live match results from
football-data.org, writes them to `matches`, re-scores every
prediction, and recalculates `standings` for every active pool.

## Required environment

```
FOOTBALL_API_URL=https://api.football-data.org/v4
FOOTBALL_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # auto-injected by Supabase
```

## Deploy

```
supabase functions deploy sync-results
```

## Schedule (every 10 minutes)

```sql
SELECT cron.schedule(
  'sync-results-every-10m',
  '*/10 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://<PROJECT-REF>.functions.supabase.co/sync-results',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (SELECT decrypted_secret
                      FROM vault.decrypted_secrets
                      WHERE name = 'sync_results_service_key')
      )
    );
  $$
);
```

Requires the `pg_cron` and `pg_net` extensions plus a vault entry for
the service-role key.  See Supabase docs → _Scheduled Edge Functions_.
