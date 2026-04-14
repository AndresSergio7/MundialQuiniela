import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import {
  purchaseAppAccess,
  purchaseExtraSlots,
  restorePurchases,
} from '@/lib/payments';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius } from '@/components/ui/theme';
import type { Entitlement } from '@/types';

export default function PurchaseScreen() {
  const router = useRouter();
  const { user, entitlement, setEntitlement } = useAuthStore();
  const { currentPool } = usePoolStore();

  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const hasAccess = entitlement?.has_app_access ?? false;
  const isWeb = Platform.OS === 'web';

  async function refreshEntitlement() {
    if (!user) return;
    const { data } = await supabase
      .from('entitlements')
      .select('*')
      .eq('user_id', user.id)
      .is('pool_id', null)
      .maybeSingle();
    if (data) setEntitlement(data as Entitlement);
  }

  async function handlePurchaseAccess() {
    if (!user) return;
    setPurchasing('access');
    setMessage(null);

    const success = await purchaseAppAccess(user.id);
    setPurchasing(null);

    if (success) {
      await refreshEntitlement();
      setMessage({ type: 'success', text: 'Access granted! You can now create pools.' });
    } else {
      setMessage({ type: 'error', text: 'Purchase failed. Please try again.' });
    }
  }

  async function handlePurchaseSlots() {
    if (!user) return;
    if (!currentPool) {
      setMessage({ type: 'error', text: 'Select a pool from Home first.' });
      return;
    }
    setPurchasing('slots');
    setMessage(null);

    const success = await purchaseExtraSlots(user.id, currentPool.id, 1);
    setPurchasing(null);

    if (success) {
      await refreshEntitlement();
      setMessage({ type: 'success', text: '1 extra member slot added!' });
    } else {
      setMessage({ type: 'error', text: 'Purchase failed. Please try again.' });
    }
  }

  async function handleRestore() {
    if (!user) return;
    setRestoring(true);
    setMessage(null);
    const success = await restorePurchases(user.id);
    if (success) {
      await refreshEntitlement();
      setMessage({ type: 'success', text: 'Purchases restored.' });
    } else {
      setMessage({ type: 'error', text: 'No previous purchases found.' });
    }
    setRestoring(false);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Get Full Access</Text>
        <Text style={styles.subtitle}>One-time purchase to join the World Cup pool</Text>
        {isWeb && (
          <View style={styles.webNote}>
            <Text style={styles.webNoteText}>
              Demo mode — purchase is simulated on web
            </Text>
          </View>
        )}
      </View>

      {/* Message banner */}
      {message && (
        <View style={[styles.messageBanner, message.type === 'success' ? styles.bannerSuccess : styles.bannerError]}>
          <Text style={styles.messageText}>{message.text}</Text>
          {message.type === 'success' && hasAccess && (
            <Button
              title="Go to Home"
              variant="outline"
              onPress={() => router.replace('/(app)')}
              style={{ marginTop: spacing.sm }}
            />
          )}
        </View>
      )}

      {/* Access status */}
      {hasAccess ? (
        <Card style={styles.activeCard}>
          <Ionicons name="checkmark-circle" size={40} color={colors.success} />
          <Text style={styles.activeTitle}>Access Active</Text>
          <Text style={styles.activeSub}>
            {entitlement?.total_slots ?? 10} member slots available
          </Text>
          <Button
            title="Go to Home"
            onPress={() => router.replace('/(app)')}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      ) : (
        <Card style={styles.pricingCard}>
          <View style={styles.pricingHeader}>
            <Text style={styles.pricingTitle}>App Access</Text>
            <Text style={styles.price}>$5.00</Text>
          </View>
          <View style={styles.features}>
            <Feature text="Create unlimited pools" />
            <Feature text="Invite up to 10 members" />
            <Feature text="Submit predictions for all 72 matches" />
            <Feature text="Live standings & scoring" />
          </View>
          <Button
            title={purchasing === 'access' ? 'Processing...' : isWeb ? 'Get Access — $5 (Demo)' : 'Purchase Access — $5'}
            onPress={handlePurchaseAccess}
            loading={purchasing === 'access'}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      )}

      {/* Extra Slots */}
      {hasAccess && (
        <Card style={styles.slotsCard}>
          <View style={styles.pricingHeader}>
            <Text style={styles.pricingTitle}>Extra Member Slots</Text>
            <Text style={styles.price}>$5 / slot</Text>
          </View>
          <Text style={styles.slotsDesc}>
            Add 1 member slot to:{' '}
            <Text style={{ fontWeight: '700' }}>
              {currentPool ? `"${currentPool.name}"` : 'no pool selected'}
            </Text>
          </Text>
          <Button
            title={purchasing === 'slots' ? 'Processing...' : 'Add 1 Slot — $5'}
            onPress={handlePurchaseSlots}
            loading={purchasing === 'slots'}
            disabled={!currentPool}
            style={{ marginTop: spacing.md }}
          />
          {!currentPool && (
            <Text style={styles.hint}>Select a pool from Home first</Text>
          )}
        </Card>
      )}

      {/* Entitlement summary */}
      {entitlement && (
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Your Entitlements</Text>
          <SummaryRow label="Base Slots" value={String(entitlement.base_slots)} />
          <SummaryRow label="Extra Slots" value={String(entitlement.extra_slots)} />
          <SummaryRow label="Total Slots" value={String(entitlement.total_slots)} bold />
        </Card>
      )}

      <Button
        title={restoring ? 'Restoring...' : 'Restore Purchases'}
        variant="outline"
        onPress={handleRestore}
        loading={restoring}
        style={{ marginTop: spacing.lg }}
      />

      <Text style={styles.legal}>
        {isWeb
          ? 'Web demo mode — no real payment processed.'
          : 'Payment processed via App Store / Google Play. One-time purchase.'}
      </Text>
    </ScrollView>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
      <Ionicons name="checkmark" size={16} color={colors.success} />
      <Text style={{ ...typography.body, color: colors.text, marginLeft: spacing.sm }}>{text}</Text>
    </View>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
      <Text style={{ ...typography.body, color: colors.textMuted }}>{label}</Text>
      <Text style={{ ...typography.body, color: colors.text, fontWeight: bold ? '700' : '400' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', paddingVertical: spacing.xl },
  title: { ...typography.h1, color: colors.primary },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  webNote: {
    backgroundColor: '#fef9c3',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.md,
  },
  webNoteText: { ...typography.caption, color: '#92400e' },
  messageBanner: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerSuccess: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: colors.success },
  bannerError: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: colors.error },
  messageText: { ...typography.body, color: colors.text },
  activeCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: colors.success,
  },
  activeTitle: { ...typography.h2, color: colors.success, marginTop: spacing.sm },
  activeSub: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  pricingCard: { marginBottom: spacing.md },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pricingTitle: { ...typography.h3, color: colors.text },
  price: { ...typography.h2, color: colors.primary },
  features: {},
  slotsCard: { marginBottom: spacing.md },
  slotsDesc: { ...typography.body, color: colors.textMuted },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
  summaryCard: { marginBottom: spacing.md },
  summaryTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  legal: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
