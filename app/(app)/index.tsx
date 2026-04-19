import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { usePool } from '@/hooks/usePool';
import { usePendingInviteStore } from '@/store/pendingInvite';
import { deletePool, leavePool } from '@/services/pools';
import { joinViaInvite } from '@/services/invites';
import { getSubmissionsForPools } from '@/services/predictions';
import { getTournamentConfig, DEFAULT_CONFIG } from '@/lib/tournament';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius, shadows } from '@/components/ui/theme';
import type { Pool, Submission } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile, entitlement } = useAuthStore();
  const { pools, loading, fetchPools, setCurrentPool } = usePool();
  const { poolId: pendingPoolId, token: pendingToken, clearPendingInvite } =
    usePendingInviteStore();

  const [submissions, setSubmissions] = useState<Record<string, Submission | null>>({});
  const [kickoffDate, setKickoffDate] = useState<Date>(DEFAULT_CONFIG.firstMatchKickoff);
  const [confirmPool, setConfirmPool] = useState<Pool | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      if (user && pendingPoolId && pendingToken) {
        await joinViaInvite(user.id, pendingPoolId, pendingToken);
        clearPendingInvite();
      }
      fetchPools();
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user || !pools.length) { setSubmissions({}); return; }
    let cancelled = false;
    getSubmissionsForPools(user.id, pools.map(p => p.id)).then(map => {
      if (!cancelled) setSubmissions(map);
    });
    return () => { cancelled = true; };
  }, [pools, user]);

  useEffect(() => {
    getTournamentConfig().then(cfg => setKickoffDate(cfg.firstMatchKickoff));
  }, []);

  function openCreateModal() {
    router.push('/(app)/purchase');
  }

  function handleSelectPool(pool: Pool) {
    setCurrentPool(pool);
    router.push('/(app)/predictions');
  }

  function handleTrashPress(pool: Pool) {
    setDeleteError(null);
    setConfirmPool(pool);
  }

  async function handleConfirmDelete() {
    if (!confirmPool || !user) return;
    setDeleting(true);
    setDeleteError(null);
    const isAdmin = confirmPool.admin_id === user.id;
    const { error } = isAdmin
      ? await deletePool(user.id, confirmPool.id)
      : await leavePool(user.id, confirmPool.id);
    setDeleting(false);
    if (error) { setDeleteError(error); return; }
    setConfirmPool(null);
    await fetchPools();
  }

  const now = Date.now();
  const msLeft = kickoffDate.getTime() - now;
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
  const hasAccess = entitlement?.has_app_access ?? false;
  const confirmIsAdmin = confirmPool ? confirmPool.admin_id === user?.id : false;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPools} tintColor={colors.accent} />}
    >
      {/* ── HERO BANNER ── */}
      <View style={styles.hero}>
        <View style={styles.heroPattern}>
          {/* decorative circles */}
          <View style={styles.heroBall1} />
          <View style={styles.heroBall2} />
        </View>
        <View style={styles.heroContent}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>⚽  FIFA WORLD CUP 2026</Text>
          </View>
          <Text style={styles.heroTitle}>Mundial{'\n'}Quiniela</Text>
          <Text style={styles.heroSub}>
            {daysLeft > 0
              ? `${daysLeft} días para el inicio`
              : '¡El torneo ha comenzado!'}
          </Text>
          {profile && (
            <View style={styles.heroGreeting}>
              <Ionicons name="person-circle" size={16} color={colors.accent} />
              <Text style={styles.heroGreetingText}>
                Bienvenido, {profile.username}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Access banner ── */}
      {!hasAccess && (
        <TouchableOpacity style={styles.accessBanner} onPress={() => router.push('/(app)/purchase')}>
          <Ionicons name="lock-open" size={18} color={colors.navy} />
          <Text style={styles.accessText}>Compra tu quiniela y participa</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.navy} />
        </TouchableOpacity>
      )}

      {/* ── My Pools ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="layers" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Mis Quinielas</Text>
          </View>
          <TouchableOpacity style={styles.newBtn} onPress={openCreateModal}>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={styles.newBtnText}>Nueva</Text>
          </TouchableOpacity>
        </View>

        {pools.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="trophy" size={42} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>Sin quinielas aún</Text>
            <Text style={styles.emptyBody}>
              Crea tu quiniela, invita a tus amigos y compite por el primer lugar.
            </Text>
            <Button
              title="Crear Quiniela"
              onPress={() => router.push('/(app)/purchase')}
              style={{ marginTop: spacing.lg }}
              size="lg"
            />
          </Card>
        ) : (
          pools.map((pool) => {
            const sub = submissions[pool.id];
            const isFinal = sub?.is_final === true;
            const badgeLabel = isFinal ? 'Enviada' : sub?.is_valid ? 'Lista' : sub ? 'Incompleta' : 'Pendiente';
            const badgeStyle = isFinal
              ? styles.badgeFinal
              : sub?.is_valid
              ? styles.badgeGreen
              : styles.badgeGray;

            return (
              <TouchableOpacity
                key={pool.id}
                onPress={() => handleSelectPool(pool)}
                activeOpacity={0.88}
              >
                <View style={[styles.poolCard, isFinal && styles.poolCardFinal]}>
                  {/* left accent stripe */}
                  <View style={[styles.poolStripe, isFinal ? styles.poolStripeGold : styles.poolStripeGreen]} />

                  <View style={styles.poolCardContent}>
                    <View style={styles.poolRow}>
                      <View style={styles.poolInfo}>
                        <Text style={styles.poolName}>{pool.name}</Text>
                        <Text style={styles.poolMeta}>
                          {pool.admin_id === user?.id ? '👑 Admin' : '👤 Miembro'} · {pool.max_members} participantes
                        </Text>
                      </View>
                      <View style={styles.poolActions}>
                        <View style={[styles.badge, badgeStyle]}>
                          <Text style={styles.badgeText}>{badgeLabel}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation(); handleTrashPress(pool); }}
                          style={styles.trashBtn}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="trash-outline" size={17} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {sub && sub.validation_errors?.length > 0 && (
                      <Text style={styles.validationError}>⚠ {sub.validation_errors[0]}</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* ── Confirm delete / leave ── */}
      <Modal
        visible={confirmPool !== null}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!deleting) setConfirmPool(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmContent}>
            <View style={styles.confirmIconWrap}>
              <Ionicons
                name={confirmIsAdmin ? 'trash' : 'exit-outline'}
                size={32}
                color={colors.error}
              />
            </View>
            <Text style={styles.confirmTitle}>
              {confirmIsAdmin ? 'Eliminar quiniela' : 'Salir de la quiniela'}
            </Text>
            <Text style={styles.confirmQuestion}>
              ¿Confirmas que quieres{' '}
              {confirmIsAdmin ? 'eliminar' : 'salir de'}{' '}
              <Text style={styles.confirmPoolName}>"{confirmPool?.name}"</Text>?
            </Text>
            <Text style={styles.confirmWarning}>
              {confirmIsAdmin
                ? 'Todos los datos serán eliminados permanentemente.'
                : 'Perderás tu acceso a esta quiniela.'}
            </Text>
            {deleteError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{deleteError}</Text>
              </View>
            )}
            {deleting ? (
              <ActivityIndicator color={colors.error} style={{ marginTop: spacing.xl }} />
            ) : (
              <View style={styles.modalButtons}>
                <Button
                  title="Cancelar"
                  variant="outline"
                  onPress={() => { setConfirmPool(null); setDeleteError(null); }}
                  fullWidth={false}
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <Button
                  title={confirmIsAdmin ? 'Eliminar' : 'Salir'}
                  variant="danger"
                  onPress={handleConfirmDelete}
                  fullWidth={false}
                  style={{ flex: 1 }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { paddingBottom: spacing.xxl },

  // Hero
  hero: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    overflow: 'hidden',
    position: 'relative',
  },
  heroPattern: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
  },
  heroBall1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -50,
    right: -40,
  },
  heroBall2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(201,168,76,0.08)',
    bottom: -30,
    left: -20,
  },
  heroContent: { position: 'relative' },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201,168,76,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.4)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 44,
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  heroSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    marginBottom: spacing.md,
  },
  heroGreeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroGreetingText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },

  // Access banner
  accessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  accessText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },

  // Section
  section: { padding: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    ...shadows.sm,
  },
  newBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.accent + '50',
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  emptyBody: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },

  // Pool card
  poolCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadows.md,
  },
  poolCardFinal: {
    backgroundColor: '#FFFDF5',
  },
  poolStripe: {
    width: 4,
    backgroundColor: colors.primary,
  },
  poolStripeGold: { backgroundColor: colors.accent },
  poolStripeGreen: { backgroundColor: colors.primary },
  poolCardContent: { flex: 1, padding: spacing.md },
  poolRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  poolInfo: { flex: 1, marginRight: spacing.sm },
  poolName: { fontSize: 16, fontWeight: '800', color: colors.text },
  poolMeta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  poolActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeFinal: { backgroundColor: colors.accent + '22', borderWidth: 1, borderColor: colors.accent },
  badgeGreen: { backgroundColor: colors.successLight, borderWidth: 1, borderColor: colors.primary + '40' },
  badgeGray:  { backgroundColor: colors.borderLight, borderWidth: 1, borderColor: colors.border },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.text },
  trashBtn: { padding: 4 },
  validationError: { fontSize: 11, color: colors.error, marginTop: spacing.xs },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  confirmContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    ...shadows.lg,
  },
  confirmIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  confirmQuestion: {
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmPoolName: { fontWeight: '800' },
  confirmWarning: {
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error + '40',
    borderRadius: radius.sm,
    padding: spacing.sm,
    width: '100%',
    marginTop: spacing.md,
  },
  errorText: { color: colors.error, fontSize: 13 },
  modalButtons: { flexDirection: 'row', marginTop: spacing.lg, width: '100%' },
});
