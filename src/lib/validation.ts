// ============================================================
// QUINIELA VALIDATION ENGINE
// ============================================================
//
// Rules:
//  1. All 72 matches must have a prediction
//  2. >= 7 distinct scorelines
//  3. >= 5 scorelines repeated 2+ times
//  4. max 28 uses of any single scoreline
//  5. >= 5 draws (home === away)
//
// ============================================================

import type { PredictionMap, ValidationResult, Scoreline } from '@/types';

const TOTAL_MATCHES = 72;
const MIN_DISTINCT_SCORELINES = 7;
const MIN_REPEATED_SCORELINES = 5;
const MAX_USES_PER_SCORELINE = 28;
const MIN_DRAWS = 5;

// Build scoreline frequency map
function buildScorelineMap(predictions: PredictionMap): Record<string, Scoreline> {
  const map: Record<string, Scoreline> = {};

  for (const pred of Object.values(predictions)) {
    const key = `${pred.home}-${pred.away}`;
    if (!map[key]) {
      map[key] = { home: pred.home, away: pred.away, count: 0, key };
    }
    map[key].count += 1;
  }

  return map;
}

// Count draws
function countDraws(predictions: PredictionMap): number {
  return Object.values(predictions).filter((p) => p.home === p.away).length;
}

export function validateQuiniela(
  predictions: PredictionMap,
  matchIds: string[]
): ValidationResult {
  const errors: string[] = [];

  // Rule 1: All matches predicted
  const predicted = Object.keys(predictions).length;
  if (predicted < TOTAL_MATCHES) {
    const missing = matchIds.filter((id) => !predictions[id]);
    errors.push(
      `Missing predictions for ${missing.length} match(es). All 72 matches required.`
    );
  }

  const scorelineMap = buildScorelineMap(predictions);
  const scorelines = Object.values(scorelineMap);

  // Rule 2: >= 7 distinct scorelines
  const distinctCount = scorelines.length;
  if (distinctCount < MIN_DISTINCT_SCORELINES) {
    errors.push(
      `Only ${distinctCount} distinct scoreline(s). Minimum ${MIN_DISTINCT_SCORELINES} required.`
    );
  }

  // Rule 3: >= 5 scorelines used 2+ times
  const repeatedCount = scorelines.filter((s) => s.count >= 2).length;
  if (repeatedCount < MIN_REPEATED_SCORELINES) {
    errors.push(
      `Only ${repeatedCount} scoreline(s) used 2+ times. Minimum ${MIN_REPEATED_SCORELINES} required.`
    );
  }

  // Rule 4: No scoreline used more than 28 times
  const overused = scorelines.filter((s) => s.count > MAX_USES_PER_SCORELINE);
  if (overused.length > 0) {
    overused.forEach((s) => {
      errors.push(
        `Scoreline ${s.home}-${s.away} used ${s.count} times. Maximum ${MAX_USES_PER_SCORELINE} allowed.`
      );
    });
  }

  // Rule 5: >= 5 draws
  const drawCount = countDraws(predictions);
  if (drawCount < MIN_DRAWS) {
    errors.push(
      `Only ${drawCount} draw(s) predicted. Minimum ${MIN_DRAWS} required.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Partial save validation (less strict — just format)
export function validateSinglePrediction(home: number, away: number): string | null {
  if (!Number.isInteger(home) || home < 0 || home > 20) {
    return 'Home score must be a whole number between 0 and 20.';
  }
  if (!Number.isInteger(away) || away < 0 || away > 20) {
    return 'Away score must be a whole number between 0 and 20.';
  }
  return null;
}

// Get stats for UI feedback
export interface QuinielaStats {
  total: number;
  predicted: number;
  distinct: number;
  repeated: number;
  draws: number;
  maxUsed: number;
  maxUsedKey: string;
}

export function getQuinielaStats(
  predictions: PredictionMap,
  totalMatches = TOTAL_MATCHES
): QuinielaStats {
  const scorelineMap = buildScorelineMap(predictions);
  const scorelines = Object.values(scorelineMap);
  const maxEntry = scorelines.reduce(
    (max, s) => (s.count > max.count ? s : max),
    { count: 0, key: '' } as Partial<Scoreline> & { count: number; key: string }
  );

  return {
    total: totalMatches,
    predicted: Object.keys(predictions).length,
    distinct: scorelines.length,
    repeated: scorelines.filter((s) => s.count >= 2).length,
    draws: countDraws(predictions),
    maxUsed: maxEntry.count,
    maxUsedKey: maxEntry.key,
  };
}
