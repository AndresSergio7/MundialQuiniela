// Web payment implementation — mock purchase (no real IAP on browser)
// For production web: integrate Stripe here

import { supabase } from './supabase';

async function grantEntitlement(
  userId: string,
  poolId: string | null,
  isAppAccess: boolean,
  extraSlots: number
): Promise<void> {
  const { data: existing } = await supabase
    .from('entitlements')
    .select('id, extra_slots, has_app_access')
    .eq('user_id', userId)
    .is('pool_id', poolId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('entitlements')
      .update({
        has_app_access: isAppAccess ? true : existing.has_app_access,
        extra_slots: existing.extra_slots + extraSlots,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('entitlements').insert({
      user_id: userId,
      pool_id: poolId,
      has_app_access: isAppAccess,
      base_slots: 10,
      extra_slots: extraSlots,
    });
  }
}

export async function initIAP(): Promise<boolean> {
  return false; // No native IAP on web
}

export async function getProducts() {
  return [];
}

// Web: mock purchase — records payment and grants entitlement
export async function purchaseAppAccess(userId: string): Promise<boolean> {
  try {
    const txId = `web_mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    await supabase.from('payments').insert({
      user_id: userId,
      amount_cents: 500,
      currency: 'USD',
      platform: 'web',
      product_id: 'com.mundialquiniela.app.access',
      transaction_id: txId,
      status: 'verified',
      payment_type: 'app_access',
      slots_purchased: 0,
      verified_at: new Date().toISOString(),
    });

    await grantEntitlement(userId, null, true, 0);
    return true;
  } catch (err) {
    console.error('Web purchaseAppAccess error:', err);
    return false;
  }
}

export async function purchaseExtraSlots(
  userId: string,
  poolId: string,
  quantity: number
): Promise<boolean> {
  try {
    const txId = `web_mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    await supabase.from('payments').insert({
      user_id: userId,
      pool_id: poolId,
      amount_cents: 500 * quantity,
      currency: 'USD',
      platform: 'web',
      product_id: 'com.mundialquiniela.extra.slots',
      transaction_id: txId,
      status: 'verified',
      payment_type: 'extra_slots',
      slots_purchased: quantity,
      verified_at: new Date().toISOString(),
    });

    await grantEntitlement(userId, poolId, false, quantity);
    return true;
  } catch (err) {
    console.error('Web purchaseExtraSlots error:', err);
    return false;
  }
}

export async function restorePurchases(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('payments')
      .select('payment_type, pool_id, slots_purchased')
      .eq('user_id', userId)
      .eq('status', 'verified');

    if (!data?.length) return false;

    for (const p of data) {
      await grantEntitlement(
        userId,
        p.pool_id ?? null,
        p.payment_type === 'app_access',
        p.payment_type === 'extra_slots' ? p.slots_purchased : 0
      );
    }
    return true;
  } catch {
    return false;
  }
}

export async function checkEntitlement(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('entitlements')
    .select('has_app_access')
    .eq('user_id', userId)
    .is('pool_id', null)
    .maybeSingle();
  return data?.has_app_access ?? false;
}
