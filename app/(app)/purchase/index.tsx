import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { purchasePoolPlan, restorePurchases } from '@/lib/payments';
import { createPool } from '@/services/pools';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
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
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Name modal (shown after a successful purchase)
  const [showNameModal, setShowNameModal] = useState(false);
  const [poolName, setPoolName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

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
    setPurchaseError(null);

    const success = await purchasePoolPlan(user.id, planId);
    setPurchasing(null);

    if (success) {
      await refreshUnused();
      // Open the name modal right away
      setPoolName('');
      setCreateError('');
      setShowNameModal(true);
    } else {
      setPurchaseError('La compra falló. Por favor intenta de nuevo.');
    }
  }

  async function handleCreatePool() {
    if (!poolName.trim() || !user) return;
    setCreating(true);
    setCreateError('');

    const { pool, error } = await createPool(user.id, poolName.trim());
    setCreating(false);

    if (error && error !== 'PURCHASE_REQUIRED') {
      setCreateError(error);
      return;
    }

    setShowNameModal(false);
    router.replace('/(app)');
  }

  async function handleRestore() {
    if (!user) return;
    setRestoring(true);
    const success = await restorePurchases(user.id);
    await refreshUnused();
    if (!success) setPurchaseError('No se encontraron compras anteriores.');
    setRestoring(false);
  }

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Crear Quiniela</Text>
          <Text style={styles.subtitle}>
            Cada compra te permite crear una quiniela con el límite de participantes elegido.
          </Text>
          {isWeb && (
            <View style={styles.webNote}>
              <Text style={styles.webNoteText}>Modo demo — la compra es simulada en web</Text>
            </View>
          )}
        </View>

        {/* Purchase error */}
        {purchaseError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{purchaseError}</Text>
          </View>
        )}

        {/* Unused entitlements — user already paid, just needs to create */}
        {unusedCount > 0 && (
          <Card style={styles.entitlementCard}>
            <Ionicons name="checkmark-circle" size={28} color={colors.success} />
            <Text style={styles.entitlementTitle}>
              {unusedCount === 1
                ? 'Tienes 1 quiniela disponible'
                : `Tienes ${unusedCount} quinielas disponibles`}
            </Text>
            <Text style={styles.entitlementSub}>
              Ya puedes crear tu quiniela sin comprar de nuevo.
            </Text>
            <Button
              title="Crear Quiniela"
              onPress={() => { setPoolName(''); setCreateError(''); setShowNameModal(true); }}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        )}

        {/* 4-tier plan cards */}
        <Text style={styles.sectionLabel}>
          {unusedCount > 0 ? 'O compra otra quiniela' : 'Elige un plan'}
        </Text>

        {POOL_PLANS.map((plan) => {
          const isBuying = purchasing === plan.id;
          return (
            <Card key={plan.id} style={styles.planCard}>
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planLabel}>{plan.slots} participantes</Text>
                  <Text style={styles.planDesc}>Crea 1 quiniela con hasta {plan.slots} participantes</Text>
                </View>
                <Text style={styles.planPrice}>{plan.priceLabel}</Text>
              </View>
              <View style={styles.planFeatures}>
                <PlanFeature text="Predicciones para los 72 partidos" />
                <PlanFeature text="Tabla de posiciones en vivo" />
                <PlanFeature text="Link de invitación reutilizable" />
              </View>
              <Button
                title={
                  isBuying
                    ? 'Procesando…'
                    : isWeb
                    ? `Comprar — ${plan.priceLabel} (Demo)`
                    : `Comprar — ${plan.priceLabel}`
                }
                onPress={() => handlePurchase(plan.id as PoolPlanId)}
                loading={isBuying}
                disabled={purchasing !== null && !isBuying}
                style={{ marginTop: spacing.md }}
              />
            </Card>
          );
        })}

        {/* Contact Us >100 */}
        <Card style={styles.contactCard}>
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planLabel}>+100 participantes</Text>
              <Text style={styles.planDesc}>¿Necesitas un grupo más grande? Contáctanos.</Text>
            </View>
            <Ionicons name="mail-outline" size={24} color={colors.primary} />
          </View>
          <Button
            title="Contáctanos"
            variant="outline"
            onPress={() => {}}
            style={{ marginTop: spacing.md }}
          />
        </Card>

        {!isWeb && (
          <Button
            title={restoring ? 'Restaurando…' : 'Restaurar Compras'}
            variant="outline"
            onPress={handleRestore}
            loading={restoring}
            style={{ marginTop: spacing.lg }}
          />
        )}

        <Text style={styles.legal}>
          {isWeb
            ? 'Modo demo — no se procesa ningún pago real.'
            : 'Pago procesado por App Store / Google Play. Una compra por quiniela.'}
        </Text>
      </ScrollView>

      {/* Name modal — shown after successful purchase or from entitlement card */}
      <Modal visible={showNameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons
              name="trophy"
              size={40}
              color={colors.primary}
              style={{ alignSelf: 'center', marginBottom: spacing.md }}
            />
            <Text style={styles.modalTitle}>¡Ponle nombre a tu quiniela!</Text>
            <Text style={styles.modalSubtitle}>
              Elige un nombre que identifique a tu grupo.
            </Text>

            <Input
              label="Nombre de la quiniela"
              value={poolName}
              onChangeText={(t) => { setPoolName(t); setCreateError(''); }}
              placeholder="Ej. Mi Quiniela 2026"
              autoFocus
            />

            {createError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{createError}</Text>
              </View>
            ) : null}

            {creating ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
            ) : (
              <View style={styles.modalButtons}>
                <Button
                  title="Cancelar"
                  variant="outline"
                  onPress={() => setShowNameModal(false)}
                  fullWidth={false}
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <Button
                  title="Crear"
                  onPress={handleCreatePool}
                  disabled={!poolName.trim()}
                  fullWidth={false}
                  style={{ flex: 1 }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
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
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
  webNote: {
    backgroundColor: '#fef9c3',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.md,
  },
  webNoteText: { ...typography.caption, color: '#92400e' },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: { ...typography.caption, color: colors.error },
  entitlementCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: colors.success,
  },
  entitlementTitle: { ...typography.h3, color: colors.success, marginTop: spacing.sm, textAlign: 'center' },
  entitlementSub: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
  sectionLabel: { ...typography.label, color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.xs },
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
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, gap: spacing.xs },
  featureText: { ...typography.caption, color: colors.text, flex: 1 },
  contactCard: { marginBottom: spacing.md },
  legal: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: { ...typography.h2, color: colors.text, textAlign: 'center', marginBottom: spacing.xs },
  modalSubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  modalButtons: { flexDirection: 'row', marginTop: spacing.lg },
});
