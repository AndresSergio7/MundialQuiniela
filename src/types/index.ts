// ============================================================
// MUNDIAL QUINIELA - TypeScript Types
// ============================================================

import type { Session, User } from '@supabase/supabase-js';

// ---- Profile ----
export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Pool ----
export interface Pool {
  id: string;
  name: string;
  admin_id: string;
  invite_token: string;
  prediction_deadline: string;
  max_members: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PoolWithMeta extends Pool {
  member_count: number;
  user_role: 'admin' | 'member';
  has_submitted: boolean;
}

// ---- Pool Member ----
export type MemberRole = 'admin' | 'member';

export interface PoolMember {
  id: string;
  pool_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  profile?: Profile;
}

// ---- Invite ----
export interface Invite {
  id: string;
  pool_id: string;
  token: string;
  created_by: string;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

// ---- Match ----
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';

export interface Match {
  id: string;
  match_number: number;
  group_name: string;
  home_team: string;
  away_team: string;
  home_team_code: string;
  away_team_code: string;
  match_date: string;
  venue: string;
  city: string;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Prediction ----
export interface Prediction {
  id: string;
  pool_id: string;
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  points_earned: number;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  match?: Match;
}

export type PredictionMap = Record<string, { home: number; away: number }>;

// ---- Submission ----
export interface Submission {
  id: string;
  pool_id: string;
  user_id: string;
  submitted_at: string;
  is_valid: boolean;
  is_final: boolean;
  validation_errors: string[];
  locked_at: string | null;
}

// ---- Standings ----
export interface Standing {
  id: string;
  pool_id: string;
  user_id: string;
  total_points: number;
  exact_scores: number;
  correct_results: number;
  matches_played: number;
  rank: number | null;
  updated_at: string;
  profile?: Profile;
}

// ---- Payment ----
export type PaymentPlatform = 'ios' | 'android' | 'web';
export type PaymentStatus = 'pending' | 'verified' | 'failed' | 'refunded';
export type PaymentType = 'app_access' | 'extra_slots';

export interface Payment {
  id: string;
  user_id: string;
  pool_id: string | null;
  amount_cents: number;
  currency: string;
  platform: PaymentPlatform;
  product_id: string;
  transaction_id: string;
  receipt_data: string | null;
  status: PaymentStatus;
  payment_type: PaymentType;
  slots_purchased: number;
  created_at: string;
  verified_at: string | null;
}

// ---- Entitlement ----
export interface Entitlement {
  id: string;
  user_id: string;
  pool_id: string | null;
  has_app_access: boolean;
  base_slots: number;
  extra_slots: number;
  total_slots: number;
  created_at: string;
  updated_at: string;
}

// ---- Scoring ----
export type ScorePoints = 0 | 1 | 3 | 4 | 6;

export interface ScoreResult {
  match_id: string;
  points: ScorePoints;
  reason: string;
}

// ---- Validation ----
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ValidationRule {
  name: string;
  check: (predictions: PredictionMap) => boolean;
  error: string;
}

// ---- Scoreline ----
export interface Scoreline {
  home: number;
  away: number;
  count: number;
  key: string;
}

// ---- Pool Plans (in-app purchase tiers) ----
export const POOL_PLANS = [
  {
    id: 'com.mundialquiniela.pool.10',
    slots: 10,
    priceCents: 499,
    priceLabel: '$4.99',
    label: '10 members',
  },
  {
    id: 'com.mundialquiniela.pool.25',
    slots: 25,
    priceCents: 799,
    priceLabel: '$7.99',
    label: '25 members',
  },
  {
    id: 'com.mundialquiniela.pool.50',
    slots: 50,
    priceCents: 1199,
    priceLabel: '$11.99',
    label: '50 members',
  },
  {
    id: 'com.mundialquiniela.pool.100',
    slots: 100,
    priceCents: 1999,
    priceLabel: '$19.99',
    label: '100 members',
  },
] as const;

export type PoolPlanId = typeof POOL_PLANS[number]['id'];

// ---- Product IDs (legacy / native IAP sku list) ----
export const PRODUCT_IDS = {
  POOL_10: {
    ios: 'com.mundialquiniela.pool.10',
    android: 'com.mundialquiniela.pool.10',
  },
  POOL_25: {
    ios: 'com.mundialquiniela.pool.25',
    android: 'com.mundialquiniela.pool.25',
  },
  POOL_50: {
    ios: 'com.mundialquiniela.pool.50',
    android: 'com.mundialquiniela.pool.50',
  },
  POOL_100: {
    ios: 'com.mundialquiniela.pool.100',
    android: 'com.mundialquiniela.pool.100',
  },
} as const;

// ---- API ----
export interface ExternalMatchResult {
  external_id: string;
  home_score: number;
  away_score: number;
  status: MatchStatus;
}

// ---- Store ----
export interface AuthState {
  session: Session | null;
  user: User | null;
  setSession: (session: Session | null) => void;
}

export interface PoolState {
  currentPool: Pool | null;
  pools: Pool[];
  setCurrentPool: (pool: Pool | null) => void;
  setPools: (pools: Pool[]) => void;
}
