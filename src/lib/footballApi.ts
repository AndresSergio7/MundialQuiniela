const FOOTBALL_API_BASE = 'https://api.football-data.org/v4';
const WC2026_COMPETITION_ID = 2000;

export interface FootballApiMatchResult {
  id: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  score: {
    fullTime: { home: number | null; away: number | null };
  };
}

async function callFootballApi<T>(path: string): Promise<T | null> {
  const apiKey = process.env.EXPO_PUBLIC_FOOTBALL_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${FOOTBALL_API_BASE}${path}`, {
      headers: { 'X-Auth-Token': apiKey },
    });

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchLiveResults(): Promise<FootballApiMatchResult[] | null> {
  const data = await callFootballApi<{ matches: FootballApiMatchResult[] }>(
    `/competitions/${WC2026_COMPETITION_ID}/matches?status=FINISHED`,
  );
  return data?.matches ?? null;
}
