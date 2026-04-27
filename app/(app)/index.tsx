import React, { useEffect, useState, useCallback } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { usePoolStore } from '@/store/pool';
import { usePendingInviteStore } from '@/store/pendingInvite';
import { deletePoolByUser, leavePool, listMyPools } from '@/services/pools.service';
import { joinViaInvite } from '@/services/invites.service';
import { getSubmissionsForPools } from '@/services/predictions.service';
import { getTournamentConfig, DEFAULT_CONFIG } from '@/lib/tournament';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius, shadows } from '@/components/ui/theme';
import type { Entitlement, Pool, Profile, Submission } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentPool, pools, setPools, setCurrentPool } = usePoolStore();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const { poolId: pendingPoolId, token: pendingToken, clearPendingInvite } =
    usePendingInviteStore();

  const [submissions, setSubmissions] = useState<Record<string, Submission | null>>({});
  const [kickoffDate, setKickoffDate] = useState<Date>(DEFAULT_CONFIG.firstMatchKickoff);
  const [confirmPool, setConfirmPool] = useState<Pool | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const nextPools = await listMyPools(user.id);
    setPools(nextPools);
    setLoading(false);
  }, [user, setPools]);

  useFocusEffect(
    useCallback(() => {
      async function init() {
        if (user && pendingPoolId && pendingToken) {
          await joinViaInvite(user.id, pendingPoolId, pendingToken);
          clearPendingInvite();
        }
        fetchPools();
      }
      init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, pendingPoolId, pendingToken]),
  );

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

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setEntitlement(null);
      return;
    }

    let cancelled = false;

    Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase
        .from('entitlements')
        .select('*')
        .eq('user_id', user.id)
        .is('pool_id', null)
        .eq('has_app_access', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]).then(([profileRes, entitlementRes]) => {
      if (cancelled) return;
      setProfile((profileRes.data as Profile | null) ?? null);
      setEntitlement((entitlementRes.data as Entitlement | null) ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

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
    const deletingPoolId = confirmPool.id;
    const isAdmin = confirmPool.admin_id === user.id;
    const { error } = isAdmin
      ? await deletePoolByUser(user.id, deletingPoolId)
      : await leavePool(user.id, deletingPoolId);
    setDeleting(false);
    if (error) { setDeleteError(error); return; }
    const remainingPools = pools.filter((pool) => pool.id !== deletingPoolId);
    setPools(remainingPools);
    if (remainingPools.length === 0) {
      setCurrentPool(null);
    } else if (currentPool?.id === deletingPoolId) {
      setCurrentPool(remainingPools[0]);
    }
    setConfirmPool(null);
    await fetchPools();
  }

  const now = Date.now();
  const msLeft = kickoffDate.getTime() - now;
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
  const hasAccess = entitlement?.has_app_access ?? false;
  const confirmIsAdmin = confirmPool ? confirmPool.admin_id === user?.id : false;
  const totalPools = pools.length;
  const submittedPools = Object.values(submissions).filter((s) => s?.is_valid).length;
  const finalPools = Object.values(submissions).filter((s) => s?.is_final).length;


  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPools} tintColor={colors.accent} />}
    >
      {/* ── HERO BANNER ── */}
      <View style={styles.hero}>
        <View style={styles.heroPattern}>
          <View style={styles.heroBall2} />
          <View style={styles.heroBall3} />
        </View>
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>FIFA WORLD CUP 2026</Text>
          </View>
          <View style={styles.heroCountdownPill}>
            <Ionicons name="time-outline" size={14} color={colors.accentBright} />
            <Text style={styles.heroCountdownText}>
              {daysLeft > 0 ? `${daysLeft} días` : 'En juego'}
            </Text>
          </View>
        </View>

        {profile && (
          <View style={styles.heroGreeting}>
            <Ionicons name="person-circle" size={16} color={colors.accent} />
            <Text style={styles.heroGreetingText}>Hola, {profile.username}</Text>
          </View>
        )}

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatChip}>
            <Text style={styles.heroStatValue}>{totalPools}</Text>
            <Text style={styles.heroStatLabel}>Quinielas</Text>
          </View>
          <View style={styles.heroStatChip}>
            <Text style={styles.heroStatValue}>{submittedPools}</Text>
            <Text style={styles.heroStatLabel}>Listas</Text>
          </View>
          <View style={styles.heroStatChip}>
            <Text style={styles.heroStatValue}>{finalPools}</Text>
            <Text style={styles.heroStatLabel}>Cerradas</Text>
          </View>
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
            <Text style={styles.sectionTitle}>Tus Quinielas Activas</Text>
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
            const isPoolAdmin = pool.admin_id === user?.id;
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
                  <View style={styles.poolGlowA} />
                  <View style={styles.poolGlowB} />
                  <View style={styles.poolCardContent}>
                    <View style={styles.poolTopRow}>
                      <View style={styles.poolLeadWrap}>
                        <View
                          style={[
                            styles.poolCrest,
                            isFinal ? styles.poolCrestFinal : styles.poolCrestOpen,
                          ]}
                        >
                          <Ionicons
                            name={isFinal ? 'shield-checkmark-outline' : 'football-outline'}
                            size={18}
                            color={isFinal ? colors.navy : colors.primary}
                          />
                        </View>

                        <View style={styles.poolInfo}>
                          <Text numberOfLines={1} style={styles.poolName}>{pool.name}</Text>

                          <View style={styles.poolTagRow}>
                            <View
                              style={[
                                styles.rolePill,
                                isPoolAdmin ? styles.rolePillAdmin : styles.rolePillMember,
                              ]}
                            >
                              <Ionicons
                                name={isPoolAdmin ? 'trophy-outline' : 'person-outline'}
                                size={12}
                                color={isPoolAdmin ? colors.accent : colors.primary}
                              />
                              <Text
                                style={[
                                  styles.rolePillText,
                                  isPoolAdmin ? styles.rolePillTextAdmin : styles.rolePillTextMember,
                                ]}
                              >
                                {isPoolAdmin ? 'Admin' : 'Miembro'}
                              </Text>
                            </View>

                            <View style={styles.poolSizePill}>
                              <Ionicons name="people-outline" size={12} color={colors.textMuted} />
                              <Text style={styles.poolSizeText}>{pool.max_members} cupos</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <View style={styles.poolTopActions}>
                        <View style={[styles.badge, badgeStyle]}>
                          <Text style={styles.badgeText}>{badgeLabel}</Text>
                        </View>

                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation(); handleTrashPress(pool); }}
                          style={styles.poolDangerBtn}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons
                            name={isPoolAdmin ? 'trash-outline' : 'exit-outline'}
                            size={17}
                            color={isPoolAdmin ? colors.error : colors.textMuted}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.poolBottomRow}>
                      <Text style={styles.poolHintText}>Entrar y editar marcadores</Text>
                      <View style={styles.poolEnterCta}>
                        <Text style={styles.poolEnterText}>Abrir</Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + spacing.lg,
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
  heroBall3: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.32)',
    top: 24,
    left: 30,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201,168,76,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.4)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1,
  },
  heroCountdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.4)',
    backgroundColor: 'rgba(13,27,42,0.25)',
  },
  heroCountdownText: {
    fontSize: 11,
    color: colors.accentBright,
    fontWeight: '800',
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroStatChip: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.11)',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  heroStatLabel: {
    fontSize: 10,
    color: '#D9E6F5',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  heroGreeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
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
    marginHorizontal: spacing.md,
    marginTop: -spacing.lg,
    borderRadius: radius.lg,
    ...shadows.md,
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
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D4E1EE',
    ...shadows.lg,
    position: 'relative',
  },
  poolCardFinal: {
    backgroundColor: '#FFFDF8',
  },
  poolGlowA: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(10,107,53,0.07)',
    top: -95,
    right: -55,
  },
  poolGlowB: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(201,168,76,0.14)',
    bottom: -62,
    left: -38,
  },
  poolCardContent: { padding: spacing.md, gap: spacing.sm },
  poolTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  poolLeadWrap: { flexDirection: 'row', flex: 1, marginRight: spacing.sm },
  poolCrest: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
  },
  poolCrestOpen: {
    backgroundColor: '#EAF6EE',
    borderColor: 'rgba(10,107,53,0.24)',
  },
  poolCrestFinal: {
    backgroundColor: '#FFF4CC',
    borderColor: 'rgba(201,168,76,0.45)',
  },
  poolInfo: { flex: 1 },
  poolName: { fontSize: 16, fontWeight: '900', color: colors.text },
  poolTagRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  rolePillAdmin: {
    backgroundColor: 'rgba(201,168,76,0.16)',
    borderColor: 'rgba(201,168,76,0.45)',
  },
  rolePillMember: {
    backgroundColor: '#EAF6EE',
    borderColor: 'rgba(10,107,53,0.24)',
  },
  rolePillText: { fontSize: 11, fontWeight: '800' },
  rolePillTextAdmin: { color: '#7A5A00' },
  rolePillTextMember: { color: colors.primary },
  poolSizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  poolSizeText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  poolTopActions: { alignItems: 'flex-end', gap: spacing.xs },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeFinal: { backgroundColor: colors.accent + '22', borderWidth: 1, borderColor: colors.accent },
  badgeGreen: { backgroundColor: colors.successLight, borderWidth: 1, borderColor: colors.primary + '40' },
  badgeGray:  { backgroundColor: colors.borderLight, borderWidth: 1, borderColor: colors.border },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.text },
  poolDangerBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  poolBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E6EDF5',
    paddingTop: spacing.sm,
  },
  poolHintText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  poolEnterCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EAF6EE',
    borderWidth: 1,
    borderColor: 'rgba(10,107,53,0.24)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  poolEnterText: { fontSize: 11, fontWeight: '800', color: colors.primary },
  validationError: {
    fontSize: 11,
    color: colors.error,
    backgroundColor: colors.errorLight,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.error + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

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
