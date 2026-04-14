// ============================================================
// QUINIELA SCORING ENGINE
// ============================================================
//
// Exact score                    → 6
// Correct result + 1 team score  → 4
// Correct draw (wrong score)     → 4
// Correct result only            → 3
// Wrong result + 1 team score    → 1
// Else                           → 0
//
// Tiebreaker: more exact scores
// ============================================================

import type { Prediction, Match, ScorePoints, ScoreResult } from '@/types';

type ResultType = 'home_win' | 'draw' | 'away_win';

function getResult(home: number, away: number): ResultType {
  if (home > away) return 'home_win';
  if (home === away) return 'draw';
  return 'away_win';
}

export function scoreOnePrediction(
  prediction: { home_score: number; away_score: number },
  actual: { home_score: number; away_score: number }
): ScorePoints {
  const predResult = getResult(prediction.home_score, prediction.away_score);
  const actualResult = getResult(actual.home_score, actual.away_score);

  const exactScore =
    prediction.home_score === actual.home_score &&
    prediction.away_score === actual.away_score;

  const correctResult = predResult === actualResult;
  const homeMatch = prediction.home_score === actual.home_score;
  const awayMatch = prediction.away_score === actual.away_score;
  const oneTeamMatch = homeMatch || awayMatch;
  const isDraw = actualResult === 'draw';

  // 6 pts: exact score
  if (exactScore) return 6;

  // 4 pts: correct result + 1 team score
  if (correctResult && oneTeamMatch) return 4;

  // 4 pts: correct draw (result right, wrong score)
  if (isDraw && correctResult) return 4;

  // 3 pts: correct result only
  if (correctResult) return 3;

  // 1 pt: wrong result + 1 team score
  if (!correctResult && oneTeamMatch) return 1;

  // 0 pts
  return 0;
}

export function scorePrediction(
  prediction: Pick<Prediction, 'match_id' | 'home_score' | 'away_score'>,
  match: Pick<Match, 'id' | 'home_score' | 'away_score' | 'status'>
): ScoreResult {
  if (match.status !== 'finished' || match.home_score === null || match.away_score === null) {
    return {
      match_id: match.id,
      points: 0,
      reason: 'Match not finished',
    };
  }

  const points = scoreOnePrediction(
    { home_score: prediction.home_score, away_score: prediction.away_score },
    { home_score: match.home_score, away_score: match.away_score }
  );

  const reasons: Record<ScorePoints, string> = {
    6: 'Exact score',
    4: 'Correct result + 1 team score / correct draw',
    3: 'Correct result',
    1: 'Wrong result + 1 team score',
    0: 'No points',
  };

  return {
    match_id: match.id,
    points,
    reason: reasons[points],
  };
}

export function scorePredictions(
  predictions: Array<Pick<Prediction, 'match_id' | 'home_score' | 'away_score'>>,
  matches: Pick<Match, 'id' | 'home_score' | 'away_score' | 'status'>[]
): ScoreResult[] {
  const matchMap = new Map(matches.map((m) => [m.id, m]));

  return predictions.map((pred) => {
    const match = matchMap.get(pred.match_id);
    if (!match) {
      return { match_id: pred.match_id, points: 0, reason: 'Match not found' };
    }
    return scorePrediction(pred, match);
  });
}

export function calculateTotalPoints(results: ScoreResult[]): number {
  return results.reduce((sum, r) => sum + r.points, 0);
}

export function calculateExactScores(results: ScoreResult[]): number {
  return results.filter((r) => r.points === 6).length;
}

export interface ScoringBreakdown {
  total: number;
  exact: number;
  correctResult: number;
  oneTeamScore: number;
  noPoints: number;
}

export function getScoringBreakdown(results: ScoreResult[]): ScoringBreakdown {
  return {
    total: calculateTotalPoints(results),
    exact: results.filter((r) => r.points === 6).length,
    correctResult: results.filter((r) => r.points === 3 || r.points === 4).length,
    oneTeamScore: results.filter((r) => r.points === 1).length,
    noPoints: results.filter((r) => r.points === 0).length,
  };
}
