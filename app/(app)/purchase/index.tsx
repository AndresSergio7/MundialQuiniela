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
import { supabase } from '@/lib/supabase';
import { purchasePoolPlan, restorePurchases } from '@/lib/payments';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius } from '@/components/ui/theme';
import { POOL_PLANS } from '@/types';
import type { PoolPlanId, Entitlement } from '@/types';

const isWeb = Platform.OS === 'web';

export default function PurchaseScreen() {
  const router = useRouter();
  const { user, setEntitlement } = useAuthStore();

  const [purchasing, setPurchasing] = useState<PoolPlanId | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [unusedCount, setUnusedCount] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    refreshUnused();
  }, []);

  async function refreshUnused() {
    if (!user) return;
    const { count } = await supabase
      .from('entitlements')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('pool_id', null)
      .eq('has_app_access', true);
    setUnusedCount(count ?? 0);

    // Also refresh auth store so pool creation screen sees it
    const { data } = await supabase
      .from('entitlements')
      .select('*')
      .eq('user_id', user.id)
      .is('pool_id', null)
      .eq('has_app_access', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data) setEntitlement(data as Entitlement);
  }

  async function handlePurchase(planId: PoolPlanId) {
    if (!user) return;
    setPurchasing(planId);
    setMessage(null);

    const success = await purchasePoolPlan(user.id, planId);
    setPurchasing(null);

    if (success) {
      await refreshUnused();
      const plan = POOL_PLANS.find((p) => p.id === planId);
      setMessage({
        type: 'success',
        text: `Purchase complete! You can now create a pool with up to ${plan?.slots ?? '?'} members.`,
      });
    } else {
      setMessage({ type: 'error', text: 'Purchase failed. Please try again.' });
    }
  }

  async function handleRestore() {
    if (!user) return;
    setRestoring(true);
    setMessage(null);
    const success = await restorePurchases(user.id);
    await refreshUnused();
    setMessage(
      success
        ? { type: 'success', text: 'Purchases restored.' }
        : { type: 'error', text: 'No previous purchases found.' }
    );
    setRestoring(false);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create a Pool</Text>
        <Text style={styles.subtitle}>
          Each purchase lets you create one pool with the chosen member limit.
        </Text>
        {isWeb && (
          <View style={styles.webNote}>
            <Text style={styles.webNoteText}>Demo mode — purchase is simulated on web</Text>
          </View>
        )}
      </View>

      {/* Message banner */}
      {message && (
        <View
          style={[
            styles.messageBanner,
            message.type === 'success' ? styles.bannerSuccess : styles.bannerError,
          ]}
        >
          <Text style={styles.messageText}>{message.text}</Text>
          {message.type === 'success' && (
            <Button
              title="Go to Home"
              variant="outline"
              onPress={() => router.replace('/(app)')}
              style={{ marginTop: spacing.sm }}
            />
          )}
        </View>
      )}

      {/* Unused entitlements summary */}
      {unusedCount > 0 && (
        <Card style={styles.entitlementCard}>
          <Ionicons name="checkmark-circle" size={28} color={colors.success} />
          <Text style={styles.entitlementTitle}>
            {unusedCount === 1
              ? 'You have 1 unused pool creation'
              : `You have ${unusedCount} unused pool creations`}
          </Text>
          <Text style={styles.entitlementSub}>
            Go to Home to create your pool, or purchase another plan below.
          </Text>
          <Button
            title="Go to Home"
            onPress={() => router.replace('/(app)')}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      )}

      {/* 4-tier plan cards */}
      <Text style={styles.sectionLabel}>
        {unusedCount > 0 ? 'Purchase another pool' : 'Choose a plan'}
      </Text>

      {POOL_PLANS.map((plan) => {
        const isBuying = purchasing === plan.id;
        return (
          <Card key={plan.id} style={styles.planCard}>
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planLabel}>{plan.slots} members</Text>
                <Text style={styles.planDesc}>Create 1 pool with up to {plan.slots} members</Text>
              </View>
              <Text style={styles.planPrice}>{plan.priceLabel}</Text>
            </View>
            <View style={styles.planFeatures}>
              <PlanFeature text="Submit predictions for all 72 matches" />
              <PlanFeature text="Live standings & leaderboard" />
              <PlanFeature text="Reusable invite link for your pool" />
            </View>
            <Button
              title={
                isBuying
                  ? 'Processing…'
                  : isWeb
                  ? `Purchase — ${plan.priceLabel} (Demo)`
                  : `Purchase — ${plan.priceLabel}`
              }
              onPress={() => handlePurchase(plan.id as PoolPlanId)}
              loading={isBuying}
              disabled={purchasing !== null && !isBuying}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        );
      })}

      {/* Contact Us for >100 */}
      <Card style={styles.contactCard}>
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planLabel}>100+ members</Text>
            <Text style={styles.planDesc}>Need a larger pool? We can help.</Text>
          </View>
          <Ionicons name="mail-outline" size={24} color={colors.primary} />
        </View>
        <Button
          title="Contact Us"
          variant="outline"
          onPress={() => {
            /* TODO: open mailto or contact form */
          }}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      {/* Restore purchases (native only) */}
      {!isWeb && (
        <Button
          title={restoring ? 'Restoring…' : 'Restore Purchases'}
          variant="outline"
          onPress={handleRestore}
          loading={restoring}
          style={{ marginTop: spacing.lg }}
        />
      )}

      <Text style={styles.legal}>
        {isWeb
          ? 'Web demo mode — no real payment is processed.'
          : 'Payment processed via App Store / Google Play. One-time purchase per pool.'}
      </Text>
    </ScrollView>
  );
}

function PlanFeature({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark" size={14} color={colors.success} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', paddingVertical: spacing.xl },
  title: { ...typography.h1, color: colors.primary },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
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
  entitlementCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: colors.success,
  },
  entitlementTitle: {
    ...typography.h3,
    color: colors.success,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  entitlementSub: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  planCard: { marginBottom: spacing.md },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  planLabel: { ...typography.h3, color: colors.text },
  planDesc: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  planPrice: { ...typography.h2, color: colors.primary },
  planFeatures: { marginTop: spacing.xs },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  featureText: { ...typography.caption, color: colors.text, flex: 1 },
  contactCard: { marginBottom: spacing.md },
  legal: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
