import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import {
  initIAP,
  getProducts,
  purchaseAppAccess,
  purchaseExtraSlots,
  restorePurchases,
} from '@/lib/payments';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius } from '@/components/ui/theme';

interface Product {
  productId: string;
  title: string;
  description: string;
  localizedPrice: string;
}

export default function PurchaseScreen() {
  const { user, entitlement, setEntitlement } = useAuthStore();
  const { currentPool } = usePoolStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [iapReady, setIapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    async function setup() {
      const ready = await initIAP();
      setIapReady(ready);
      if (ready) {
        const prods = await getProducts();
        setProducts(prods as Product[]);
      }
      setLoading(false);
    }
    setup();
  }, []);

  async function handlePurchaseAccess() {
    if (!user) return;
    setPurchasing('access');
    const success = await purchaseAppAccess(user.id);
    setPurchasing(null);

    if (success) {
      Alert.alert('Purchase Successful!', 'You now have full app access.');
      // Refresh entitlement
      const { data } = await import('@/lib/supabase').then(({ supabase }) =>
        supabase
          .from('entitlements')
          .select('*')
          .eq('user_id', user.id)
          .is('pool_id', null)
          .single()
      );
      if (data) setEntitlement(data);
    } else {
      Alert.alert('Purchase Failed', 'Please try again or contact support.');
    }
  }

  async function handlePurchaseSlots() {
    if (!user || !currentPool) {
      Alert.alert('No Pool Selected', 'Select a pool from Home first.');
      return;
    }
    setPurchasing('slots');
    const success = await purchaseExtraSlots(user.id, currentPool.id, 1);
    setPurchasing(null);

    if (success) {
      Alert.alert('Slots Added!', '1 additional member slot has been added to your pool.');
    } else {
      Alert.alert('Purchase Failed', 'Please try again.');
    }
  }

  async function handleRestore() {
    if (!user) return;
    setRestoring(true);
    const success = await restorePurchases(user.id);
    setRestoring(false);
    Alert.alert(
      success ? 'Restored' : 'Nothing to Restore',
      success ? 'Your purchases have been restored.' : 'No previous purchases found.'
    );
  }

  const hasAccess = entitlement?.has_app_access ?? false;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Get Full Access</Text>
        <Text style={styles.subtitle}>One-time purchase to join the World Cup pool</Text>
      </View>

      {/* Access Status */}
      {hasAccess ? (
        <Card style={styles.activeCard}>
          <Ionicons name="checkmark-circle" size={40} color={colors.success} />
          <Text style={styles.activeTitle}>Access Active</Text>
          <Text style={styles.activeSub}>
            {entitlement?.total_slots ?? 10} member slots available
          </Text>
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
            title={purchasing === 'access' ? 'Processing...' : 'Purchase Access — $5'}
            onPress={handlePurchaseAccess}
            loading={purchasing === 'access'}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      )}

      {/* Extra Slots */}
      <Card style={styles.slotsCard}>
        <View style={styles.pricingHeader}>
          <Text style={styles.pricingTitle}>Extra Member Slots</Text>
          <Text style={styles.price}>$5 / slot</Text>
        </View>
        <Text style={styles.slotsDesc}>
          Add 1 additional member slot to your current pool.
          {currentPool ? ` Pool: "${currentPool.name}"` : ' Select a pool first.'}
        </Text>
        <Button
          title={purchasing === 'slots' ? 'Processing...' : 'Add 1 Slot — $5'}
          variant={hasAccess ? 'primary' : 'outline'}
          onPress={handlePurchaseSlots}
          loading={purchasing === 'slots'}
          disabled={!hasAccess}
          style={{ marginTop: spacing.md }}
        />
        {!hasAccess && (
          <Text style={styles.requiresAccess}>Requires app access first</Text>
        )}
      </Card>

      {/* Entitlement Summary */}
      {entitlement && (
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Your Entitlements</Text>
          <SummaryRow label="Base Slots" value={String(entitlement.base_slots)} />
          <SummaryRow label="Extra Slots" value={String(entitlement.extra_slots)} />
          <SummaryRow label="Total Slots" value={String(entitlement.total_slots)} bold />
        </Card>
      )}

      {/* Restore */}
      <Button
        title={restoring ? 'Restoring...' : 'Restore Purchases'}
        variant="outline"
        onPress={handleRestore}
        loading={restoring}
        style={{ marginTop: spacing.lg }}
      />

      <Text style={styles.legal}>
        Payment processed securely via the App Store / Google Play.
        One-time purchase. No subscription.
      </Text>
    </ScrollView>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={featureStyles.row}>
      <Ionicons name="checkmark" size={16} color={colors.success} />
      <Text style={featureStyles.text}>{text}</Text>
    </View>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={summaryStyles.row}>
      <Text style={summaryStyles.label}>{label}</Text>
      <Text style={[summaryStyles.value, bold && summaryStyles.bold]}>{value}</Text>
    </View>
  );
}

const featureStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  text: { ...typography.body, color: colors.text, marginLeft: spacing.sm },
});

const summaryStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  label: { ...typography.body, color: colors.textMuted },
  value: { ...typography.body, color: colors.text },
  bold: { fontWeight: '700', color: colors.primary },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', paddingVertical: spacing.xl },
  title: { ...typography.h1, color: colors.primary },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
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
  features: { gap: 0 },
  slotsCard: { marginBottom: spacing.md },
  slotsDesc: { ...typography.body, color: colors.textMuted },
  requiresAccess: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
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
