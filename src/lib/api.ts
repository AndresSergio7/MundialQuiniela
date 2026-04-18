// ============================================================
// LIVE RESULTS API INTEGRATION
// Provider: football-data.org (mock fallback, real-API-ready)
//
// The preferred sync path is the `sync-results` Edge Function
// (scheduled every 10 min).  The functions exported here stay as
// a client-side fallback for dev / manual "Sync now" buttons.
// ============================================================

import { supabase } from './supabase';
import {
  scorePredictions,
  calculateTotalPoints,
  calculateExactScores,
} from './scoring';
import type { Match, ExternalMatchResult } from '@/types';

// ---- Config ----
const API_BASE_URL =
  process.env.EXPO_PUBLIC_FOOTBALL_API_URL ?? 'https://api.football-data.org/v4';
const API_KEY = process.env.EXPO_PUBLIC_FOOTBALL_API_KEY ?? '';
const WC2026_COMPETITION_ID = 2000;

// ---- Fetch from external API ----
async function callFootballApi<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { 'X-Auth-Token': API_KEY, 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.warn('Football API call failed, using mock data:', err);
    return null;
  }
}

function getMockResults(): ExternalMatchResult[] {
  return [
    { external_id: 'mock_1', home_score: 2, away_score: 1, status: 'finished' },
    { external_id: 'mock_2', home_score: 0, away_score: 0, status: 'finished' },
  ];
}

interface ApiMatch {
  id: number;
  status: string;
  score: { fullTime: { home: number | null; away: number | null } };
}
interface ApiMatchesResponse {
  matches: ApiMatch[];
}

export async function fetchMatches(): Promise<ExternalMatchResult[]> {
  const data = await callFootballApi<ApiMatchesResponse>(
    `/competitions/${WC2026_COMPETITION_ID}/matches?stage=GROUP_STAGE`,
  );
  if (!data?.matches) return getMockResults();

  return data.matches.map((m): ExternalMatchResult => ({
    external_id: String(m.id),
    home_score: m.score.fullTime.home ?? 0,
    away_score: m.score.fullTime.away ?? 0,
    status: mapApiStatus(m.status),
  }));
}

function mapApiStatus(apiStatus: string): Match['status'] {
  switch (apiStatus) {
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

// ---- Update match results in DB ----
// Single batched upsert keyed on external_id.
export async function updateResults(results: ExternalMatchResult[]): Promise<void> {
  if (!results.length) return;

  const extIds = results.map((r) => r.external_id);
  const { data: existing } = await supabase
    .from('matches')
    .select('id, external_id')
    .in('external_id', extIds);

  const byExt = new Map((existing ?? []).map((m) => [m.external_id, m.id]));

  const rows = results
    .map((r) => ({
      id: byExt.get(r.external_id),
      external_id: r.external_id,
      home_score: r.home_score,
      away_score: r.away_score,
      status: r.status,
      updated_at: new Date().toISOString(),
    }))
    .filter((r) => r.id);

  if (!rows.length) return;

  // Update-only path: avoid inserting unknown matches.  Issue one
  // UPDATE per row but grouped on the same connection.
  await Promise.all(
    rows.map((r) =>
      supabase
        .from('matches')
        .update({
          home_score: r.home_score,
          away_score: r.away_score,
          status: r.status,
          updated_at: r.updated_at,
        })
        .eq('id', r.id!),
    ),
  );
}

// ---- Client-side fallback scorer -------------------------
// Used when the user taps "Sync Results" and the Edge Function
// isn't reachable.  The canonical pipeline is the scheduled
// sync-results function.
export async function recalculateStandings(poolId: string): Promise<void> {
  const [{ data: matches }, { data: submissions }] = await Promise.all([
    supabase
      .from('matches')
      .select('id, home_score, away_score, status')
      .eq('status', 'finished'),
    supabase
      .from('submissions')
      .select('user_id')
      .eq('pool_id', poolId)
      .eq('is_valid', true),
  ]);

  if (!matches?.length || !submissions?.length) {
    // still ask the DB to recompute ranks/empties
    await supabase.rpc('recalculate_standings', { p_pool_id: poolId });
    return;
  }

  const submittedUserIds = submissions.map((s: { user_id: string }) => s.user_id);

  const { data: predictions } = await supabase
    .from('predictions')
    .select('match_id, user_id, home_score, away_score')
    .eq('pool_id', poolId)
    .in('user_id', submittedUserIds);

  if (!predictions?.length) {
    await supabase.rpc('recalculate_standings', { p_pool_id: poolId });
    return;
  }

  // Group predictions by user.
  const byUser = new Map<string, typeof predictions>();
  for (const p of predictions) {
    const list = byUser.get(p.user_id) ?? [];
    list.push(p);
    byUser.set(p.user_id, list);
  }

  // Score per user + batch the per-prediction point updates.
  for (const [userId, userPredictions] of byUser) {
    const results = scorePredictions(userPredictions, matches as Match[]);

    // Upsert the aggregate row.  The final ranks are re-computed
    // by recalculate_standings below.
    await supabase.from('standings').upsert(
      {
        pool_id: poolId,
        user_id: userId,
        total_points: calculateTotalPoints(results),
        exact_scores: calculateExactScores(results),
        correct_results: results.filter((r) => r.points >= 3).length,
        matches_played: results.filter((r) => r.points > 0 || r.reason !== 'Match not finished').length,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pool_id,user_id' },
    );

    // Batch per-prediction updates in parallel.
    await Promise.all(
      userPredictions.map((pred) => {
        const scored = results.find((r) => r.match_id === pred.match_id);
        if (!scored) return Promise.resolve();
        return supabase
          .from('predictions')
          .update({ points_earned: scored.points })
          .eq('pool_id', poolId)
          .eq('user_id', userId)
          .eq('match_id', pred.match_id);
      }),
    );
  }

  // Final rank pass.
  await supabase.rpc('recalculate_standings', { p_pool_id: poolId });
}

// ---- Full sync cycle -------------------------------------
// Tries the Edge Function first; falls back to client-side code
// if the function isn't deployed / reachable.
export async function syncResults(poolId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('sync-results');
    if (!error) return;
    console.warn('sync-results edge invoke failed, using client fallback:', error.message);
  } catch (err) {
    console.warn('sync-results invoke threw, using client fallback:', err);
  }

  const results = await fetchMatches();
  await updateResults(results);
  await recalculateStandings(poolId);
}
