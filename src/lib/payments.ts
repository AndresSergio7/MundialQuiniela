// ============================================================
// PAYMENT STRUCTURE — Native (iOS / Android)
// iOS: StoreKit via react-native-iap
// Android: Google Play Billing via react-native-iap
// ============================================================

import { Platform } from 'react-native';
import * as IAP from 'react-native-iap';
import { supabase } from './supabase';
import { POOL_PLANS } from '@/types';
import type { PoolPlanId, Payment } from '@/types';

// All purchasable SKUs
const ALL_SKUS = POOL_PLANS.map((p) => p.id);

// ---- Initialize IAP connection ----
export async function initIAP(): Promise<boolean> {
  try {
    await IAP.initConnection();
    return true;
  } catch (err) {
    console.warn('IAP init failed:', err);
    return false;
  }
}

// ---- Fetch products from store ----
export async function getProducts(): Promise<IAP.Product[]> {
  try {
    return await IAP.getProducts({ skus: ALL_SKUS });
  } catch (err) {
    console.warn('Failed to fetch products:', err);
    return [];
  }
}

// ---- Purchase a pool plan ----
export async function purchasePoolPlan(
  userId: string,
  planId: PoolPlanId
): Promise<boolean> {
  const plan = POOL_PLANS.find((p) => p.id === planId);
  if (!plan) return false;

  try {
    const purchase = await IAP.requestPurchase({ sku: planId });

    const transactionId =
      (purchase as IAP.ProductPurchase).transactionId ??
      `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const receiptData =
      Platform.OS === 'ios'
        ? (purchase as IAP.ProductPurchase).transactionReceipt
        : (purchase as IAP.ProductPurchase).purchaseToken;

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
      .select()
      .single();

    if (error || !payment) throw new Error('Failed to save payment record');

    const verified = await validateReceipt(payment as Payment);
    if (verified) {
      // Grant one unused pool-creation entitlement
      await supabase.from('entitlements').insert({
        user_id: userId,
        pool_id: null,
        has_app_access: true,
        base_slots: plan.slots,
        extra_slots: 0,
      });
      await IAP.finishTransaction({ purchase: purchase as IAP.ProductPurchase });
      return true;
    }

    return false;
  } catch (err) {
    console.error('purchasePoolPlan error:', err);
    return false;
  }
}

// ---- Backend receipt validation (structured, mock for MVP) ----
async function validateReceipt(payment: Payment): Promise<boolean> {
  try {
    // Production: call POST /api/validate-receipt with receipt_data
    const isValid = true; // Replace with real Apple/Google validation

    await supabase
      .from('payments')
      .update({
        status: isValid ? 'verified' : 'failed',
        verified_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    return isValid;
  } catch {
    return false;
  }
}

// ---- Restore purchases ----
export async function restorePurchases(userId: string): Promise<boolean> {
  try {
    const purchases = await IAP.getAvailablePurchases();

    for (const purchase of purchases) {
      const plan = POOL_PLANS.find((p) => p.id === purchase.productId);
      if (!plan) continue;

      await supabase.from('entitlements').insert({
        user_id: userId,
        pool_id: null,
        has_app_access: true,
        base_slots: plan.slots,
        extra_slots: 0,
      });
    }

    return purchases.length > 0;
  } catch (err) {
    console.warn('restorePurchases failed:', err);
    return false;
  }
}

// ---- Check entitlement ----
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

// ---- Legacy stubs ----
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
