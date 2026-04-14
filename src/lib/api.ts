// ============================================================
// LIVE RESULTS API INTEGRATION
// Provider: football-data.org (mocked structure, real-API-ready)
// ============================================================

import { supabase } from './supabase';
import { scorePredictions, calculateTotalPoints, calculateExactScores } from './scoring';
import type { Match, ExternalMatchResult } from '@/types';

// ---- Config ----
const API_BASE_URL = process.env.EXPO_PUBLIC_FOOTBALL_API_URL ?? 'https://api.football-data.org/v4';
const API_KEY = process.env.EXPO_PUBLIC_FOOTBALL_API_KEY ?? '';
const WC2026_COMPETITION_ID = 2000; // football-data.org World Cup ID

// ---- Fetch from external API ----
async function callFootballApi<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'X-Auth-Token': API_KEY,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.warn('Football API call failed, using mock data:', err);
    return null;
  }
}

// ---- Mock data (used when API is unavailable) ----
function getMockResults(): ExternalMatchResult[] {
  return [
    { external_id: 'mock_1', home_score: 2, away_score: 1, status: 'finished' },
    { external_id: 'mock_2', home_score: 0, away_score: 0, status: 'finished' },
  ];
}

// ---- Fetch matches from API ----
interface ApiMatch {
  id: number;
  status: string;
  score: {
    fullTime: { home: number | null; away: number | null };
  };
}

interface ApiMatchesResponse {
  matches: ApiMatch[];
}

export async function fetchMatches(): Promise<ExternalMatchResult[]> {
  const data = await callFootballApi<ApiMatchesResponse>(
    `/competitions/${WC2026_COMPETITION_ID}/matches?stage=GROUP_STAGE`
  );

  if (!data?.matches) {
    console.log('Using mock match results');
    return getMockResults();
  }

  return data.matches.map((m): ExternalMatchResult => ({
    external_id: String(m.id),
    home_score: m.score.fullTime.home ?? 0,
    away_score: m.score.fullTime.away ?? 0,
    status: mapApiStatus(m.status),
  }));
}

function mapApiStatus(apiStatus: string): Match['status'] {
  switch (apiStatus) {
    case 'FINISHED': return 'finished';
    case 'IN_PLAY':
    case 'PAUSED': return 'live';
    case 'POSTPONED': return 'postponed';
    default: return 'scheduled';
  }
}

// ---- Update match results in DB ----
export async function updateResults(results: ExternalMatchResult[]): Promise<void> {
  for (const result of results) {
    await supabase
      .from('matches')
      .update({
        home_score: result.home_score,
        away_score: result.away_score,
        status: result.status,
        updated_at: new Date().toISOString(),
      })
      .eq('external_id', result.external_id);
  }
}

// ---- Recalculate standings for a pool ----
export async function recalculateStandings(poolId: string): Promise<void> {
  // Fetch finished matches
  const { data: matches } = await supabase
    .from('matches')
    .select('id, home_score, away_score, status')
    .eq('status', 'finished');

  if (!matches?.length) return;

  // Fetch all predictions in this pool
  const { data: predictions } = await supabase
    .from('predictions')
    .select('match_id, user_id, home_score, away_score')
    .eq('pool_id', poolId);

  if (!predictions?.length) return;

  // Group by user
  const byUser = new Map<string, typeof predictions>();
  for (const p of predictions) {
    const list = byUser.get(p.user_id) ?? [];
    list.push(p);
    byUser.set(p.user_id, list);
  }

  // Score and upsert standings per user
  for (const [userId, userPredictions] of byUser) {
    const results = scorePredictions(userPredictions, matches as Match[]);
    const total = calculateTotalPoints(results);
    const exact = calculateExactScores(results);
    const correct = results.filter((r) => r.points >= 3).length;

    await supabase.from('standings').upsert(
      {
        pool_id: poolId,
        user_id: userId,
        total_points: total,
        exact_scores: exact,
        correct_results: correct,
        matches_played: results.filter((r) => r.points > 0 || r.reason !== 'Match not finished').length,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pool_id,user_id' }
    );

    // Update individual prediction points
    for (const pred of userPredictions) {
      const scored = results.find((r) => r.match_id === pred.match_id);
      if (scored) {
        await supabase
          .from('predictions')
          .update({ points_earned: scored.points })
          .eq('pool_id', poolId)
          .eq('user_id', userId)
          .eq('match_id', pred.match_id);
      }
    }
  }

  // Assign ranks via DB function
  await supabase.rpc('recalculate_standings', { p_pool_id: poolId });
}

// ---- Full sync cycle ----
export async function syncResults(poolId: string): Promise<void> {
  const results = await fetchMatches();
  await updateResults(results);
  await recalculateStandings(poolId);
}
