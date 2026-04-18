// ============================================================
// sync-results — scheduled Edge Function.
// Runs every 10 min (see supabase/functions/sync-results/README.md)
// Fetches match results from football-data.org, updates the
// matches table, and recalculates standings for every active pool.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const API_BASE =
  Deno.env.get('FOOTBALL_API_URL') ?? 'https://api.football-data.org/v4';
const API_KEY = Deno.env.get('FOOTBALL_API_KEY') ?? '';
const WC2026_ID = 2000;

interface ApiMatch {
  id: number;
  status: string;
  score: { fullTime: { home: number | null; away: number | null } };
}

function mapStatus(s: string): 'scheduled' | 'live' | 'finished' | 'postponed' {
  switch (s) {
    case 'FINISHED':
      return 'finished';
    case 'IN_PLAY':
    case 'PAUSED':
      return 'live';
    case 'POSTPONED':
      return 'postponed';
    default:
      return 'scheduled';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 1. pull latest match results
  let updated = 0;
  try {
    const res = await fetch(
      `${API_BASE}/competitions/${WC2026_ID}/matches?stage=GROUP_STAGE`,
      { headers: { 'X-Auth-Token': API_KEY } },
    );
    if (res.ok) {
      const body = (await res.json()) as { matches: ApiMatch[] };
      for (const m of body.matches) {
        const home = m.score.fullTime.home ?? 0;
        const away = m.score.fullTime.away ?? 0;
        const { error } = await supabase
          .from('matches')
          .update({
            home_score: home,
            away_score: away,
            status: mapStatus(m.status),
            updated_at: new Date().toISOString(),
          })
          .eq('external_id', String(m.id));
        if (!error) updated++;
      }
    } else {
      console.warn('football-data.org returned', res.status);
    }
  } catch (err) {
    console.error('fetch matches failed', err);
  }

  // 2. recompute every active pool.  The SQL function is
  // SECURITY DEFINER so RLS is bypassed.
  const { data: pools } = await supabase
    .from('pools')
    .select('id')
    .eq('is_active', true);

  let recalculated = 0;
  for (const p of pools ?? []) {
    // Score individual predictions first (the heavy work).
    // We do it here instead of in-DB to reuse the existing
    // scoring rules unchanged; a follow-up migration can move
    // them into SQL.
    const { data: matches } = await supabase
      .from('matches')
      .select('id, home_score, away_score, status')
      .eq('status', 'finished');

    const { data: preds } = await supabase
      .from('predictions')
      .select('id, match_id, user_id, home_score, away_score')
      .eq('pool_id', p.id);

    if (matches && preds) {
      const byMatch = new Map(matches.map((m) => [m.id, m]));
      for (const pred of preds) {
        const m = byMatch.get(pred.match_id);
        if (!m || m.status !== 'finished') continue;
        const pts = score(pred, m);
        await supabase
          .from('predictions')
          .update({ points_earned: pts })
          .eq('id', pred.id);
      }
    }

    await supabase.rpc('recalculate_standings', { p_pool_id: p.id });
    recalculated++;
  }

  return new Response(
    JSON.stringify({
      ok: true,
      matches_updated: updated,
      pools_recalculated: recalculated,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});

// ---------- local copy of scoring rules ----------
// Mirrors src/lib/scoring.ts (6/4/3/1/0).
function score(
  p: { home_score: number; away_score: number },
  m: { home_score: number | null; away_score: number | null },
): number {
  if (m.home_score == null || m.away_score == null) return 0;

  const exact = p.home_score === m.home_score && p.away_score === m.away_score;
  if (exact) return 6;

  const pRes = Math.sign(p.home_score - p.away_score);
  const mRes = Math.sign(m.home_score - m.away_score);

  const goalsMatchHome = p.home_score === m.home_score;
  const goalsMatchAway = p.away_score === m.away_score;

  if (pRes === 0 && mRes === 0) return 4; // correct draw, wrong score
  if (pRes === mRes && (goalsMatchHome || goalsMatchAway)) return 4;
  if (pRes === mRes) return 3;
  if (goalsMatchHome || goalsMatchAway) return 1;
  return 0;
}
