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
import { purchasePoolPlan } from '@/lib/payments';
import { createPoolLegacy as createPool, listMyPools } from '@/services/pools.service';
import { applyUnusedEntitlementToPool, getSingleSoloAdminPoolId } from '@/services/invites.service';
import { usePoolStore } from '@/store/pool';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography, radius, shadows } from '@/components/ui/theme';
import { POOL_PLANS } from '@/types';
import type { PoolPlanId, Entitlement } from '@/types';

const isWeb = Platform.OS === 'web';

const PLAN_ICONS = ['people-outline', 'people-outline', 'people-outline', 'globe-outline'] as const;
const POPULAR_PLAN_IDX = 1;

export default function PurchaseScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const setPools = usePoolStore((s) => s.setPools);
  const setCurrentPool = usePoolStore((s) => s.setCurrentPool);
  const currentPool = usePoolStore((s) => s.currentPool);

  const [purchasing, setPurchasing] = useState<PoolPlanId | null>(null);
  const [unusedEntitlements, setUnusedEntitlements] = useState<Entitlement[]>([]);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const [showNameModal, setShowNameModal] = useState(false);
  const [poolName, setPoolName] = useState('');
  const [selectedEntitlementId, setSelectedEntitlementId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    refreshUnused();
  }, []);

  async function refreshUnused(): Promise<Entitlement[]> {
    if (!user) return [];
    const { data } = await supabase
      .from('entitlements')
      .select('*')
      .eq('user_id', user.id)
      .is('pool_id', null)
      .eq('has_app_access', true)
      .order('created_at', { ascending: true });
    const list = (data ?? []) as Entitlement[];
    setUnusedEntitlements(list);
    return list;
  }

  async function handlePurchase(planId: PoolPlanId) {
    if (!user) return;
    setPurchasing(planId);
    setPurchaseError(null);

    const success = await purchasePoolPlan(user.id, planId);
    setPurchasing(null);

    if (success) {
      const soloTarget = await getSingleSoloAdminPoolId(user.id);

      if (soloTarget) {
        const { error: attachError } = await applyUnusedEntitlementToPool(user.id, soloTarget);
        if (!attachError) {
          await refreshUnused();
          const nextPools = await listMyPools(user.id);
          setPools(nextPools);
          const updated = nextPools.find((p) => p.id === soloTarget);
          if (updated && currentPool?.id === soloTarget) setCurrentPool(updated);
          router.replace('/(app)/invites');
          return;
        }
        setPurchaseError(
          attachError === 'PURCHASE_REQUIRED'
            ? 'No se pudo aplicar la compra a la quiniela. Usa "Crear" abajo o vuelve a intentar.'
            : attachError,
        );
      }

      const list = await refreshUnused();
      setPoolName('');
      setCreateError('');
      setSelectedEntitlementId(list[0]?.id ?? null);
      setShowNameModal(true);
    } else {
      setPurchaseError('La compra falló. Por favor intenta de nuevo.');
    }
  }

  async function handleCreatePool() {
    if (!poolName.trim() || !user) return;
    setCreating(true);
    setCreateError('');

    const { pool, error } = await createPool(
      user.id,
      poolName.trim(),
      selectedEntitlementId ?? undefined,
    );
    setCreating(false);

    if (error) {
      setCreateError(
        error === 'PURCHASE_REQUIRED'
          ? 'No se encontró una compra disponible. Intenta comprar nuevamente.'
          : error,
      );
      return;
    }

    setShowNameModal(false);
    setSelectedEntitlementId(null);
    router.replace('/(app)');
  }

  function openNameModalForEntitlement(ent: Entitlement) {
    setPoolName('');
    setCreateError('');
    setSelectedEntitlementId(ent.id);
    setShowNameModal(true);
  }

  function openNameModalWithoutPurchase() {
    setPoolName('');
    setCreateError('');
    setSelectedEntitlementId(null);
    setShowNameModal(true);
  }

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>

        {/* Hero header */}
        <View style={styles.hero}>
          <View style={styles.heroGlowA} />
          <View style={styles.heroGlowB} />
          <Text style={styles.heroEyebrow}>PAGOS</Text>
          <View style={styles.heroIconWrap}>
            <Ionicons name="card" size={34} color={colors.accent} />
          </View>
          <Text style={styles.heroTitle}>Planes de quiniela</Text>
          <Text style={styles.heroSubtitle}>
            Compra, crea tu quiniela y participa al instante. Diseño simple y escalable para crecer por ligas.
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaChip}>
              <Ionicons name="flash-outline" size={12} color={colors.accentBright} />
              <Text style={styles.heroMetaText}>Activación inmediata</Text>
            </View>
            <View style={styles.heroMetaChip}>
              <Ionicons name="shield-checkmark-outline" size={12} color={colors.accentBright} />
              <Text style={styles.heroMetaText}>Pago seguro</Text>
            </View>
          </View>
          {isWeb && (
            <View style={styles.webNote}>
              <Ionicons name="information-circle-outline" size={14} color="#92400e" />
              <Text style={styles.webNoteText}> Modo demo — la compra es simulada en web</Text>
            </View>
          )}
        </View>

        {/* Purchase error */}
        {purchaseError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={styles.errorText}> {purchaseError}</Text>
          </View>
        )}

        {/* Unused entitlements */}
        {unusedEntitlements.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionLabel}>
                {unusedEntitlements.length === 1
                  ? 'Tienes 1 compra disponible'
                  : `Tienes ${unusedEntitlements.length} compras disponibles`}
              </Text>
            </View>
            {unusedEntitlements.map((ent) => (
              <View key={ent.id} style={styles.entitlementCard}>
                <View style={styles.entitlementAccent} />
                <View style={styles.entitlementBody}>
                  <View style={styles.entitlementIconWrap}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  </View>
                  <View style={styles.entitlementInfo}>
                    <Text style={styles.entitlementTitle}>
                      Quiniela para {ent.base_slots} participantes
                    </Text>
                    <Text style={styles.entitlementSub}>Lista — sin costo adicional</Text>
                  </View>
                  <Button
                    title="Crear"
                    size="sm"
                    onPress={() => openNameModalForEntitlement(ent)}
                    fullWidth={false}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Plan cards */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionLabel}>
              {unusedEntitlements.length > 0 ? 'Comprar otra quiniela' : 'Planes disponibles'}
            </Text>
          </View>

          {unusedEntitlements.length === 0 && (
            <View style={styles.freeCreateCard}>
              <Text style={styles.freeCreateTitle}>¿Primero quieres crear tu quiniela?</Text>
              <Text style={styles.freeCreateSub}>
                Puedes crearla gratis ahora mismo. Solo pagarás cuando quieras invitar participantes.
              </Text>
              <Button
                title="Crear quiniela gratis"
                variant="outline"
                onPress={openNameModalWithoutPurchase}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          )}

          {POOL_PLANS.map((plan, idx) => {
            const isBuying = purchasing === plan.id;
            const isPopular = idx === POPULAR_PLAN_IDX;
            return (
              <View key={plan.id} style={[styles.planCard, isPopular && styles.planCardPopular]}>
                {isPopular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>MÁS POPULAR</Text>
                  </View>
                )}
                <View style={styles.planTop}>
                  <View style={styles.planIconWrap}>
                    <Ionicons name={PLAN_ICONS[idx] ?? 'people-outline'} size={20} color={isPopular ? colors.accent : colors.primary} />
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={[styles.planSlots, isPopular && styles.planSlotsPopular]}>
                      {plan.slots} participantes
                    </Text>
                    <Text style={styles.planDesc}>
                      Crea 1 quiniela con hasta {plan.slots} personas
                    </Text>
                  </View>
                  <Text style={[styles.planPrice, isPopular && styles.planPricePopular]}>
                    {plan.priceLabel}
                  </Text>
                </View>

                <View style={styles.planFeatures}>
                  <PlanFeature text="Todos los partidos del mundial" gold={isPopular} />
                  <PlanFeature text="Tabla en vivo con ranking" gold={isPopular} />
                  <PlanFeature text="Invita y gestiona participantes" gold={isPopular} />
                </View>

                <Button
                  title={
                    isBuying
                      ? 'Procesando…'
                      : isWeb
                      ? `Comprar — ${plan.priceLabel} (Demo)`
                      : `Comprar — ${plan.priceLabel}`
                  }
                  variant={isPopular ? 'gold' : 'primary'}
                  onPress={() => handlePurchase(plan.id as PoolPlanId)}
                  loading={isBuying}
                  disabled={purchasing !== null && !isBuying}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            );
          })}
        </View>

        {/* Payments note */}
        <View style={styles.contactCard}>
          <View style={styles.contactRow}>
            <View style={styles.contactIconWrap}>
              <Ionicons name="receipt-outline" size={22} color={colors.navyMid} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Tu compra queda ligada a tu cuenta</Text>
              <Text style={styles.contactSub}>Puedes comprar tantas quinielas como quieras, cada una con su propio grupo.</Text>
            </View>
          </View>
        </View>

        <Text style={styles.legal}>
          {isWeb
            ? 'Modo demo — no se procesa ningún pago real.'
            : 'Pago procesado por App Store / Google Play.\nUna compra por quiniela creada.'}
        </Text>
      </ScrollView>

      {/* Name modal */}
      <Modal visible={showNameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="trophy" size={28} color={colors.accent} />
            </View>
            <Text style={styles.modalTitle}>¡Ponle nombre!</Text>
            <Text style={styles.modalSubtitle}>
              {selectedEntitlementId
                ? `Capacidad: ${unusedEntitlements.find(e => e.id === selectedEntitlementId)?.base_slots ?? '?'} participantes`
                : 'Se creará con 1 participante. Al invitar, te pediremos elegir un plan.'}
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
                  variant="gold"
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

function PlanFeature({ text, gold }: { text: string; gold?: boolean }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark" size={14} color={gold ? colors.accent : colors.success} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { paddingBottom: spacing.xxl },

  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primaryDark,
    overflow: 'hidden',
  },
  heroGlowA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: radius.full,
    backgroundColor: 'rgba(201,168,76,0.1)',
    top: -80,
    right: -60,
  },
  heroGlowB: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -70,
    left: -40,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accentBright,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: 'rgba(201,168,76,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: { ...typography.h1, color: '#fff', textAlign: 'center' },
  heroSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  heroMetaRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  heroMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.35)',
    backgroundColor: 'rgba(13,27,42,0.24)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  heroMetaText: {
    ...typography.tiny,
    color: colors.accentLight,
    fontWeight: '700',
  },
  webNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef9c3',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.md,
  },
  webNoteText: { ...typography.caption, color: '#92400e' },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  errorText: { ...typography.caption, color: colors.error },

  section: { paddingHorizontal: spacing.md, paddingTop: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: spacing.sm,
  },
  sectionLabel: { ...typography.label, color: colors.textMuted },
  freeCreateCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  freeCreateTitle: { ...typography.label, color: colors.text },
  freeCreateSub: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },

  entitlementCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadows.sm,
  },
  entitlementAccent: { width: 4, backgroundColor: colors.success },
  entitlementBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  entitlementIconWrap: { marginRight: spacing.xs },
  entitlementInfo: { flex: 1 },
  entitlementTitle: { ...typography.label, color: colors.success, fontWeight: '700' },
  entitlementSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  planCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  planCardPopular: {
    borderColor: colors.accent,
    borderWidth: 2,
    ...shadows.gold,
  },
  popularBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginBottom: spacing.sm,
  },
  popularBadgeText: {
    ...typography.tiny,
    color: colors.accent,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  planTop: { flexDirection: 'row', alignItems: 'center' },
  planIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  planInfo: { flex: 1 },
  planSlots: { ...typography.h4, color: colors.text },
  planSlotsPopular: { color: colors.navyMid },
  planDesc: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  planPrice: { ...typography.h2, color: colors.primary },
  planPricePopular: { color: colors.accent },
  planFeatures: { marginTop: spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, gap: spacing.xs },
  featureText: { ...typography.caption, color: colors.text, flex: 1 },

  contactCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center' },
  contactIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  contactInfo: { flex: 1 },
  contactTitle: { ...typography.label, color: colors.text },
  contactSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  legal: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginHorizontal: spacing.xl,
    lineHeight: 18,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { ...typography.h2, color: colors.text, textAlign: 'center', marginBottom: spacing.xs },
  modalSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalButtons: { flexDirection: 'row', marginTop: spacing.lg },
});
