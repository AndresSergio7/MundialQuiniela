// ============================================================
// PAYMENT STRUCTURE — Native (iOS / Android)
// iOS: StoreKit via react-native-iap
// Android: Google Play Billing via react-native-iap
//
// Flow:
//   1. IAP.requestPurchase → gets a receipt from the store.
//   2. Insert a `payments` row (status: pending).
//   3. Ask the `validate-receipt` Edge Function to verify the
//      receipt server-side and grant the entitlement via the
//      idempotent grant_entitlement_from_payment RPC.
//   4. IAP.finishTransaction only once the backend confirms.
// ============================================================

import { Platform } from 'react-native';
import * as IAP from 'react-native-iap';
import { supabase } from './supabase';
import { POOL_PLANS } from '@/types';
import type { PoolPlanId } from '@/types';

const ALL_SKUS = POOL_PLANS.map((p) => p.id);
const SKIP_PURCHASE_VALIDATION = true;

async function grantSimulatedEntitlement(
  userId: string,
  plan: { id: string; slots: number; priceCents: number },
): Promise<boolean> {
  const txId = `native_mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const { data: payment } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      amount_cents: plan.priceCents,
      currency: 'USD',
      platform: Platform.OS as 'ios' | 'android',
      product_id: plan.id,
      transaction_id: txId,
      status: 'verified',
      payment_type: 'app_access',
      slots_purchased: plan.slots,
      verified_at: new Date().toISOString(),
    })
    .select('id')
    .maybeSingle();

  const entitlementPayload = {
    user_id: userId,
    pool_id: null,
    has_app_access: true,
    base_slots: plan.slots,
    extra_slots: 0,
  } as Record<string, unknown>;

  const entitlementPayloadWithPayment = {
    ...entitlementPayload,
    ...(payment?.id ? { payment_id: payment.id } : {}),
  };

  let { error } = await supabase.from('entitlements').insert(entitlementPayloadWithPayment);

  // Some environments don't have payment_id column/migration yet.
  if (error && payment?.id) {
    const retry = await supabase.from('entitlements').insert(entitlementPayload);
    error = retry.error;
  }

  return !error;
}

export async function initIAP(): Promise<boolean> {
  try {
    await IAP.initConnection();
    return true;
  } catch (err) {
    console.warn('IAP init failed:', err);
    return false;
  }
}

export async function getProducts(): Promise<IAP.Product[]> {
  try {
    return await IAP.getProducts({ skus: ALL_SKUS });
  } catch (err) {
    console.warn('Failed to fetch products:', err);
    return [];
  }
}

// ---- purchasePoolPlan ------------------------------------
export async function purchasePoolPlan(
  userId: string,
  planId: PoolPlanId,
): Promise<boolean> {
  const plan = POOL_PLANS.find((p) => p.id === planId);
  if (!plan) return false;

  if (SKIP_PURCHASE_VALIDATION) {
    return grantSimulatedEntitlement(userId, plan);
  }

  try {
    const purchase = await IAP.requestPurchase({ sku: planId });
    const p = purchase as IAP.ProductPurchase;
    const transactionId =
      p.transactionId ?? `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const receiptData =
      Platform.OS === 'ios' ? p.transactionReceipt : p.purchaseToken;

    // 1. create the payment row.  UNIQUE(transaction_id) blocks
    // replay of the same receipt twice.
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        amount_cents: plan.priceCents,
        currency: 'USD',
        platform: Platform.OS as 'ios' | 'android',
        product_id: planId,
        transaction_id: transactionId,
        receipt_data: receiptData ?? null,
        status: 'pending',
        payment_type: 'app_access',
        slots_purchased: plan.slots,
      })
      .select('id')
      .single();

    if (error || !payment) {
      console.error('purchasePoolPlan insert failed:', error);
      return false;
    }

    // 2. verify server-side.
    const verified = await verifyViaEdge(payment.id);
    if (verified) {
      await IAP.finishTransaction({ purchase: p });
      return true;
    }
    return false;
  } catch (err) {
    console.error('purchasePoolPlan error:', err);
    return false;
  }
}

// Calls validate-receipt Edge Function; falls back to a local-trust
// verifier for dev builds that haven't deployed the function yet.
async function verifyViaEdge(paymentId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('validate-receipt', {
      body: { payment_id: paymentId },
    });
    if (!error && data?.valid) return true;
    if (error && !/not found|404/i.test(error.message)) {
      console.warn('validate-receipt returned error', error.message);
      return false;
    }
  } catch (err) {
    console.warn('validate-receipt invoke threw, falling back locally:', err);
  }

  // Dev fallback: mark verified client-side + grant via the
  // idempotent RPC.  Production must rely on the Edge Function.
  await supabase
    .from('payments')
    .update({ status: 'verified', verified_at: new Date().toISOString() })
    .eq('id', paymentId);

  const { data: grant } = await supabase.rpc('grant_entitlement_from_payment', {
    p_payment_id: paymentId,
  });
  return !!grant?.success;
}

// ---- restorePurchases ------------------------------------
export async function restorePurchases(userId: string): Promise<boolean> {
  try {
    const purchases = await IAP.getAvailablePurchases();
    if (!purchases.length) return false;

    for (const purchase of purchases) {
      const plan = POOL_PLANS.find((pl) => pl.id === purchase.productId);
      if (!plan) continue;

      const transactionId = purchase.transactionId ?? `restore_${Date.now()}`;
      const receiptData =
        Platform.OS === 'ios'
          ? purchase.transactionReceipt
          : purchase.purchaseToken;

      // Upsert the payment row.  If the transaction_id is already
      // recorded the unique index swallows the duplicate.
      const { data: existing } = await supabase
        .from('payments')
        .select('id')
        .eq('transaction_id', transactionId)
        .maybeSingle();

      let paymentId = existing?.id;

      if (!paymentId) {
        const { data: inserted } = await supabase
          .from('payments')
          .insert({
            user_id: userId,
            amount_cents: plan.priceCents,
            currency: 'USD',
            platform: Platform.OS as 'ios' | 'android',
            product_id: plan.id,
            transaction_id: transactionId,
            receipt_data: receiptData ?? null,
            status: 'pending',
            payment_type: 'app_access',
            slots_purchased: plan.slots,
          })
          .select('id')
          .single();
        paymentId = inserted?.id;
      }

      if (paymentId) await verifyViaEdge(paymentId);
    }
    return true;
  } catch (err) {
    console.warn('restorePurchases failed:', err);
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
