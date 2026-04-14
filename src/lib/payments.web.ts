// Web stub for react-native-iap (not available in browser)
// In production web, redirect to Stripe or similar.

import { supabase } from './supabase';
import type { PaymentType } from '@/types';

export async function initIAP(): Promise<boolean> {
  return false;
}

export async function getProducts() {
  return [];
}

export async function purchaseAppAccess(_userId: string): Promise<boolean> {
  console.warn('IAP not available on web. Integrate Stripe for web payments.');
  return false;
}

export async function purchaseExtraSlots(
  _userId: string,
  _poolId: string,
  _quantity: number
): Promise<boolean> {
  console.warn('IAP not available on web. Integrate Stripe for web payments.');
  return false;
}

export async function restorePurchases(_userId: string): Promise<boolean> {
  return false;
}

export async function checkEntitlement(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('entitlements')
    .select('has_app_access')
    .eq('user_id', userId)
    .is('pool_id', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.has_app_access ?? false;
}
