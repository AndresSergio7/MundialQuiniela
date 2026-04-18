// ============================================================
// Tournament config — driven by the `tournament_config` table.
// The app is single-tournament; this keeps the deadline, total
// match count, and display name in one place and out of hardcodes.
// ============================================================

import { supabase } from './supabase';

export interface TournamentConfig {
  tournamentName: string;
  firstMatchKickoff: Date;
  totalMatches: number;
}

// Sensible defaults so the UI can render before Supabase responds.
export const DEFAULT_CONFIG: TournamentConfig = {
  tournamentName: 'FIFA World Cup 2026',
  firstMatchKickoff: new Date('2026-06-11T18:00:00Z'),
  totalMatches: 72,
};

let cache: TournamentConfig | null = null;
let pending: Promise<TournamentConfig> | null = null;

export async function getTournamentConfig(
  force = false,
): Promise<TournamentConfig> {
  if (!force && cache) return cache;
  if (!force && pending) return pending;

  pending = (async () => {
    try {
      const { data } = await supabase.rpc('get_tournament_config');
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.first_match_kickoff) {
        cache = {
          tournamentName: row.tournament_name ?? DEFAULT_CONFIG.tournamentName,
          firstMatchKickoff: new Date(row.first_match_kickoff),
          totalMatches: row.total_matches ?? DEFAULT_CONFIG.totalMatches,
        };
        return cache;
      }
    } catch {
      /* fall through to defaults */
    }
    cache = DEFAULT_CONFIG;
    return cache;
  })();

  try {
    return await pending;
  } finally {
    pending = null;
  }
}

export function clearTournamentConfigCache() {
  cache = null;
}
