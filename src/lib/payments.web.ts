// Web payment implementation — mock purchases (no real IAP on browser).
// For production web: replace purchasePoolPlan with a Stripe Checkout flow.

import { supabase } from './supabase';
import { POOL_PLANS } from '@/types';
import type { PoolPlanId } from '@/types';

// ---- purchasePoolPlan ----
// Grants one pool-creation entitlement with the chosen capacity.
// On native this is backed by a real IAP; on web it is simulated.
export async function purchasePoolPlan(
  userId: string,
  planId: PoolPlanId
): Promise<boolean> {
  const plan = POOL_PLANS.find((p) => p.id === planId);
  if (!plan) return false;

  try {
    const txId = `web_mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    await supabase.from('payments').insert({
      user_id: userId,
      amount_cents: plan.priceCents,
      currency: 'USD',
      platform: 'web',
      product_id: plan.id,
      transaction_id: txId,
      status: 'verified',
      payment_type: 'app_access',
      slots_purchased: plan.slots,
      verified_at: new Date().toISOString(),
    });

    // Create one unused entitlement (pool_id = null means "not yet consumed").
    // PostgreSQL allows multiple rows with pool_id IS NULL under a
    // UNIQUE(user_id, pool_id) constraint because NULLs are distinct.
    await supabase.from('entitlements').insert({
      user_id: userId,
      pool_id: null,
      has_app_access: true,
      base_slots: plan.slots,
      extra_slots: 0,
    });

    return true;
  } catch (err) {
    console.error('Web purchasePoolPlan error:', err);
    return false;
  }
}

// ---- restorePurchases ----
// Re-creates entitlement rows for any verified payments that have no
// matching entitlement yet.
export async function restorePurchases(userId: string): Promise<boolean> {
  try {
    const { data: payments } = await supabase
      .from('payments')
      .select('product_id, slots_purchased, transaction_id')
      .eq('user_id', userId)
      .eq('status', 'verified')
      .eq('payment_type', 'app_access');

    if (!payments?.length) return false;

    for (const p of payments) {
      const plan = POOL_PLANS.find((pl) => pl.id === p.product_id);
      if (!plan) continue;

      // Only restore if no unused entitlement already exists for this plan
      // (we can't perfectly de-duplicate without a payment→entitlement link,
      // so for V1 we simply insert — this may over-grant on repeated restores,
      // but is safe for demo/web use)
      await supabase.from('entitlements').insert({
        user_id: userId,
        pool_id: null,
        has_app_access: true,
        base_slots: plan.slots,
        extra_slots: 0,
      });
    }

    return true;
  } catch {
    return false;
  }
}

// ---- checkEntitlement ----
// Returns true if the user has at least one unused pool-creation purchase.
export async function checkEntitlement(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('entitlements')
    .select('id')
    .eq('user_id', userId)
    .is('pool_id', null)
    .eq('has_app_access', true)
    .limit(1)
    .maybeSingle();
  return data != null;
}

// ---- Legacy stubs (kept so old imports don't break) ----
export async function initIAP(): Promise<boolean> { return false; }
export async function getProducts() { return []; }

/** @deprecated Use purchasePoolPlan instead */
export async function purchaseAppAccess(userId: string): Promise<boolean> {
  return purchasePoolPlan(userId, 'com.mundialquiniela.pool.10');
}

/** @deprecated No longer used in V1 */
export async function purchaseExtraSlots(
  _userId: string,
  _poolId: string,
  _quantity: number
): Promise<boolean> {
  return false;
}
