// ============================================================
// QUINIELA VALIDATION ENGINE
// ------------------------------------------------------------
// The "shape" rules below mirror the real-world quiniela format
// but are now data-driven: pass a `ValidationConfig` or let the
// engine derive sensible ratios from the actual match count
// (useful for test pools and future tournament formats).
// ============================================================

import type {
  PredictionMap,
  ValidationResult,
  Scoreline,
} from '@/types';

export interface ValidationConfig {
  totalMatches: number;
  minDistinctScorelines: number;
  minRepeatedScorelines: number;
  maxUsesPerScoreline: number;
  minDraws: number;
}

// Defaults tuned for 72 matches — unchanged from the legacy spec.
export const DEFAULT_CONFIG: ValidationConfig = {
  totalMatches: 72,
  minDistinctScorelines: 7,
  minRepeatedScorelines: 5,
  maxUsesPerScoreline: 28,
  minDraws: 5,
};

// Scales the defaults to any match count.  Keeps integer results
// and hard floors so a tiny test pool still makes sense.
export function deriveConfig(totalMatches: number): ValidationConfig {
  if (totalMatches === DEFAULT_CONFIG.totalMatches) return DEFAULT_CONFIG;
  const ratio = totalMatches / DEFAULT_CONFIG.totalMatches;
  return {
    totalMatches,
    minDistinctScorelines: Math.max(1, Math.round(DEFAULT_CONFIG.minDistinctScorelines * ratio)),
    minRepeatedScorelines: Math.max(0, Math.round(DEFAULT_CONFIG.minRepeatedScorelines * ratio)),
    maxUsesPerScoreline: Math.max(1, Math.round(DEFAULT_CONFIG.maxUsesPerScoreline * ratio)),
    minDraws: Math.max(1, Math.round(DEFAULT_CONFIG.minDraws * ratio)),
  };
}

function buildScorelineMap(predictions: PredictionMap): Record<string, Scoreline> {
  const map: Record<string, Scoreline> = {};
  for (const pred of Object.values(predictions)) {
    const key = `${pred.home}-${pred.away}`;
    if (!map[key]) map[key] = { home: pred.home, away: pred.away, count: 0, key };
    map[key].count += 1;
  }
  return map;
}

function countDraws(predictions: PredictionMap): number {
  return Object.values(predictions).filter((p) => p.home === p.away).length;
}

// Main entry point.  `matchIds` drives the total count + missing
// list; `config` can be passed explicitly (production) or derived
// from `matchIds.length` (tests, future tournaments).
export function validateQuiniela(
  predictions: PredictionMap,
  matchIds: string[],
  config?: ValidationConfig,
): ValidationResult {
  const cfg = config ?? deriveConfig(matchIds.length);
  const errors: string[] = [];

  // Rule 1: every match predicted.
  const predicted = Object.keys(predictions).length;
  if (predicted < cfg.totalMatches) {
    const missing = matchIds.filter((id) => !predictions[id]).length;
    errors.push(
      `Faltan ${missing} predicción(es). Se requieren los ${cfg.totalMatches} partidos.`,
    );
  }

  const scorelineMap = buildScorelineMap(predictions);
  const scorelines = Object.values(scorelineMap);

  // Rule 2: minimum distinct scorelines.
  if (scorelines.length < cfg.minDistinctScorelines) {
    errors.push(
      `Solo ${scorelines.length} marcador(es) distintos. Mínimo ${cfg.minDistinctScorelines}.`,
    );
  }

  // Rule 3: minimum scorelines used 2+ times.
  const repeated = scorelines.filter((s) => s.count >= 2).length;
  if (repeated < cfg.minRepeatedScorelines) {
    errors.push(
      `Solo ${repeated} marcador(es) repetidos. Mínimo ${cfg.minRepeatedScorelines}.`,
    );
  }

  // Rule 4: no scoreline overused.
  for (const s of scorelines) {
    if (s.count > cfg.maxUsesPerScoreline) {
      errors.push(
        `El marcador ${s.home}-${s.away} se usó ${s.count} veces. Máximo ${cfg.maxUsesPerScoreline}.`,
      );
    }
  }

  // Rule 5: minimum draws.
  const draws = countDraws(predictions);
  if (draws < cfg.minDraws) {
    errors.push(`Solo ${draws} empate(s). Mínimo ${cfg.minDraws}.`);
  }

  return { valid: errors.length === 0, errors };
}

// Single-cell validation used in the edit UI.
export function validateSinglePrediction(home: number, away: number): string | null {
  if (!Number.isInteger(home) || home < 0 || home > 20) {
    return 'El marcador local debe ser un número entero entre 0 y 20.';
  }
  if (!Number.isInteger(away) || away < 0 || away > 20) {
    return 'El marcador visitante debe ser un número entero entre 0 y 20.';
  }
  return null;
}

// Quick stats for live UI feedback (progress bar, counters).
export interface QuinielaStats {
  total: number;
  predicted: number;
  distinct: number;
  repeated: number;
  draws: number;
  maxUsed: number;
  maxUsedKey: string;
  config: ValidationConfig;
}

export function getQuinielaStats(
  predictions: PredictionMap,
  totalMatches = DEFAULT_CONFIG.totalMatches,
  config?: ValidationConfig,
): QuinielaStats {
  const cfg = config ?? deriveConfig(totalMatches);
  const scorelineMap = buildScorelineMap(predictions);
  const scorelines = Object.values(scorelineMap);
  const maxEntry = scorelines.reduce(
    (max, s) => (s.count > max.count ? s : max),
    { count: 0, key: '' } as Partial<Scoreline> & { count: number; key: string },
  );

  return {
    total: cfg.totalMatches,
    predicted: Object.keys(predictions).length,
    distinct: scorelines.length,
    repeated: scorelines.filter((s) => s.count >= 2).length,
    draws: countDraws(predictions),
    maxUsed: maxEntry.count,
    maxUsedKey: maxEntry.key,
    config: cfg,
  };
}
