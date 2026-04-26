import { supabase } from '@/lib/supabase';
import type { Profile, UserPaymentMethod } from '@/types';

interface SavePaymentMethodInput {
  userId: string;
  cardBrand: string;
  cardLast4: string;
  expMonth: number;
  expYear: number;
  holderName?: string;
  provider?: string;
  providerCustomerId?: string;
  providerPaymentMethodId?: string;
  isDefault?: boolean;
}

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  return (data as Profile | null) ?? null;
}

export async function updateMyProfile(
  userId: string,
  payload: {
    full_name?: string | null;
    avatar_url?: string | null;
  },
) {
  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId);

  return { success: !error, error: error?.message ?? null };
}

export async function listMyPaymentMethods(userId: string): Promise<UserPaymentMethod[]> {
  const { data } = await supabase
    .from('user_payment_methods')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  return (data as UserPaymentMethod[] | null) ?? [];
}

export async function saveMyPaymentMethod(input: SavePaymentMethodInput) {
  if (input.isDefault) {
    await supabase
      .from('user_payment_methods')
      .update({ is_default: false })
      .eq('user_id', input.userId);
  }

  const { error } = await supabase
    .from('user_payment_methods')
    .insert({
      user_id: input.userId,
      card_brand: input.cardBrand,
      card_last4: input.cardLast4,
      exp_month: input.expMonth,
      exp_year: input.expYear,
      holder_name: input.holderName ?? null,
      provider: input.provider ?? 'manual_tokenized',
      provider_customer_id: input.providerCustomerId ?? null,
      provider_payment_method_id: input.providerPaymentMethodId ?? null,
      is_default: Boolean(input.isDefault),
    });

  return { success: !error, error: error?.message ?? null };
}

export async function setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
  const clearRes = await supabase
    .from('user_payment_methods')
    .update({ is_default: false })
    .eq('user_id', userId);

  if (clearRes.error) {
    return { success: false, error: clearRes.error.message };
  }

  const setRes = await supabase
    .from('user_payment_methods')
    .update({ is_default: true })
    .eq('user_id', userId)
    .eq('id', paymentMethodId);

  return { success: !setRes.error, error: setRes.error?.message ?? null };
}

export async function removePaymentMethod(userId: string, paymentMethodId: string) {
  const { error } = await supabase
    .from('user_payment_methods')
    .delete()
    .eq('user_id', userId)
    .eq('id', paymentMethodId);

  return { success: !error, error: error?.message ?? null };
}
