// Web payment implementation — demo / mock purchases (no real IAP on browser).
// For production web: replace purchasePoolPlan with a Stripe Checkout flow
// and call validate-receipt from the Stripe webhook.

import { supabase } from './supabase';
import { POOL_PLANS } from '@/types';
import type { PoolPlanId } from '@/types';

// ---- purchasePoolPlan ------------------------------------
// 1. inserts a `payments` row (status: verified for demo),
// 2. calls grant_entitlement_from_payment — idempotent so retries
//    and restores can never double-grant.
export async function purchasePoolPlan(
  userId: string,
  planId: PoolPlanId,
): Promise<boolean> {
  const plan = POOL_PLANS.find((p) => p.id === planId);
  if (!plan) return false;

  try {
    const txId = `web_mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
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
      })
      .select('id')
      .single();

    if (payErr || !payment) throw payErr ?? new Error('payment insert failed');

    const { data: grant } = await supabase.rpc('grant_entitlement_from_payment', {
      p_payment_id: payment.id,
    });

    // Fallback for deployments where the RPC hasn't been applied yet:
    // try a direct insert, tolerating duplicates.
    if (!grant?.success) {
      await supabase.from('entitlements').insert({
        user_id: userId,
        pool_id: null,
        has_app_access: true,
        base_slots: plan.slots,
        extra_slots: 0,
        payment_id: payment.id,
      });
    }
    return true;
  } catch (err) {
    console.error('Web purchasePoolPlan error:', err);
    return false;
  }
}

// ---- restorePurchases ------------------------------------
// Idempotent: for every verified payment we call the RPC which
// dedupes on (user_id, payment_id).
export async function restorePurchases(userId: string): Promise<boolean> {
  try {
    const { data: payments } = await supabase
      .from('payments')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'verified')
      .eq('payment_type', 'app_access');

    if (!payments?.length) return false;

    await Promise.all(
      payments.map((p) =>
        supabase.rpc('grant_entitlement_from_payment', { p_payment_id: p.id }),
      ),
    );
    return true;
  } catch {
    return false;
  }
}

// ---- checkEntitlement ------------------------------------
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

// ---- Legacy stubs ----------------------------------------
export async function initIAP(): Promise<boolean> {
  return false;
}
export async function getProducts() {
  return [];
}

/** @deprecated Use purchasePoolPlan instead */
export async function purchaseAppAccess(userId: string): Promise<boolean> {
  return purchasePoolPlan(userId, 'com.mundialquiniela.pool.10');
}

/** @deprecated No longer used in V1 */
export async function purchaseExtraSlots(
  _userId: string,
  _poolId: string,
  _quantity: number,
): Promise<boolean> {
  return false;
}
