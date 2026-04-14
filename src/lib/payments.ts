// ============================================================
// PAYMENT STRUCTURE
// iOS: StoreKit via react-native-iap
// Android: Google Play Billing via react-native-iap
// Backend: Supabase receipt validation (structured/mocked)
// ============================================================

import { Platform } from 'react-native';
import * as IAP from 'react-native-iap';
import { supabase } from './supabase';
import type { Payment, PaymentType, PRICES } from '@/types';
import { PRODUCT_IDS } from '@/types';

// ---- Product definitions ----
const IOS_PRODUCTS = [
  PRODUCT_IDS.APP_ACCESS.ios,
  PRODUCT_IDS.EXTRA_SLOTS.ios,
];

const ANDROID_PRODUCTS = [
  PRODUCT_IDS.APP_ACCESS.android,
  PRODUCT_IDS.EXTRA_SLOTS.android,
];

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
    const productIds = Platform.OS === 'ios' ? IOS_PRODUCTS : ANDROID_PRODUCTS;
    return await IAP.getProducts({ skus: productIds });
  } catch (err) {
    console.warn('Failed to fetch products:', err);
    return [];
  }
}

// ---- Purchase app access ($5) ----
export async function purchaseAppAccess(userId: string): Promise<boolean> {
  const productId =
    Platform.OS === 'ios'
      ? PRODUCT_IDS.APP_ACCESS.ios
      : PRODUCT_IDS.APP_ACCESS.android;

  return await requestPurchase(userId, productId, 'app_access', 500, 0);
}

// ---- Purchase extra member slots ($5 per user) ----
export async function purchaseExtraSlots(
  userId: string,
  poolId: string,
  quantity: number
): Promise<boolean> {
  const productId =
    Platform.OS === 'ios'
      ? PRODUCT_IDS.EXTRA_SLOTS.ios
      : PRODUCT_IDS.EXTRA_SLOTS.android;

  return await requestPurchase(
    userId,
    productId,
    'extra_slots',
    500 * quantity,
    quantity,
    poolId
  );
}

// ---- Core purchase flow ----
async function requestPurchase(
  userId: string,
  productId: string,
  paymentType: PaymentType,
  amountCents: number,
  slots: number,
  poolId?: string
): Promise<boolean> {
  try {
    const purchase = await IAP.requestPurchase({ sku: productId });

    // Extract receipt/transaction info
    const transactionId =
      (purchase as IAP.ProductPurchase).transactionId ??
      `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const receiptData =
      Platform.OS === 'ios'
        ? (purchase as IAP.ProductPurchase).transactionReceipt
        : (purchase as IAP.ProductPurchase).purchaseToken;

    // Save payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        pool_id: poolId ?? null,
        amount_cents: amountCents,
        currency: 'USD',
        platform: Platform.OS as 'ios' | 'android',
        product_id: productId,
        transaction_id: transactionId,
        receipt_data: receiptData ?? null,
        status: 'pending',
        payment_type: paymentType,
        slots_purchased: slots,
      })
      .select()
      .single();

    if (error || !payment) throw new Error('Failed to save payment');

    // Validate receipt
    const verified = await validateReceipt(payment as Payment);
    if (verified) {
      await grantEntitlement(userId, poolId ?? null, paymentType, slots);
      await IAP.finishTransaction({ purchase: purchase as IAP.ProductPurchase });
      return true;
    }

    return false;
  } catch (err) {
    console.error('Purchase failed:', err);
    return false;
  }
}

// ---- Backend receipt validation (mocked but structured) ----
async function validateReceipt(payment: Payment): Promise<boolean> {
  try {
    // In production: call your backend validation endpoint
    // POST /api/validate-receipt
    // { platform, receipt_data, transaction_id, product_id }
    //
    // iOS: call Apple /verifyReceipt endpoint
    // Android: call Google Play Developer API
    //
    // For MVP: mock validation (always succeeds for real transactions)
    const isMock = payment.transaction_id.startsWith('mock_');

    // Simulate validation
    const isValid = true; // Replace with real API call

    // Update payment status
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

// ---- Grant entitlement after successful payment ----
async function grantEntitlement(
  userId: string,
  poolId: string | null,
  paymentType: PaymentType,
  extraSlots: number
): Promise<void> {
  const { data: existing } = await supabase
    .from('entitlements')
    .select('*')
    .eq('user_id', userId)
    .is('pool_id', poolId)
    .single();

  if (existing) {
    await supabase
      .from('entitlements')
      .update({
        has_app_access: paymentType === 'app_access' ? true : existing.has_app_access,
        extra_slots: existing.extra_slots + extraSlots,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('entitlements').insert({
      user_id: userId,
      pool_id: poolId,
      has_app_access: paymentType === 'app_access',
      base_slots: 10,
      extra_slots: extraSlots,
    });
  }
}

// ---- Restore purchases ----
export async function restorePurchases(userId: string): Promise<boolean> {
  try {
    const purchases = await IAP.getAvailablePurchases();

    for (const purchase of purchases) {
      if (purchase.productId === PRODUCT_IDS.APP_ACCESS.ios ||
          purchase.productId === PRODUCT_IDS.APP_ACCESS.android) {
        await grantEntitlement(userId, null, 'app_access', 0);
      }
    }

    return true;
  } catch (err) {
    console.warn('Restore purchases failed:', err);
    return false;
  }
}

// ---- Check entitlement ----
export async function checkEntitlement(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('entitlements')
    .select('has_app_access')
    .eq('user_id', userId)
    .is('pool_id', null)
    .single();

  return data?.has_app_access ?? false;
}
