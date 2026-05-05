import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Share,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import { generateInviteLink } from '@/services/invites.service';
import { fetchPoolById, getPoolMembers, listMyPools, removeMember } from '@/services/pools.service';
import { PoolSelectorBar } from '@/components/PoolSelectorBar';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography, radius, shadows } from '@/components/ui/theme';
import type { PoolMember, Pool } from '@/types';

export default function InvitesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentPool, setCurrentPool, setPools } = usePoolStore();

  const [members, setMembers] = useState<PoolMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const isAdmin = currentPool?.admin_id === user?.id;

  async function loadData(pool?: Pool) {
    const activePool = pool ?? currentPool;
    if (!activePool) return;
    setLoading(true);
    setError(null);
    const m = await getPoolMembers(activePool.id);
    setMembers(m);
    setLoading(false);
  }

  function handlePoolSelect(pool: Pool) {
    setError(null);
    setRemoveError(null);
    setShareSuccess(false);
    loadData(pool);
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPool?.id]);

  // Al volver desde Comprar / Inicio el store puede tener max_members viejo; mismo id no dispara el effect de arriba.
  useFocusEffect(
    useCallback(() => {
      const uid = user?.id;
      if (!uid) return;
      const userId = uid;
      let cancelled = false;

      async function syncPoolFromServer() {
        const pool = usePoolStore.getState().currentPool;
        if (!pool) {
          setError(null);
          return;
        }
        setError(null);
        setShareSuccess(false);
        try {
          const fresh = await fetchPoolById(pool.id);
          if (cancelled) return;
          setCurrentPool(fresh);
          const nextPools = await listMyPools(userId);
          if (cancelled) return;
          setPools(nextPools);
          const m = await getPoolMembers(fresh.id);
          if (cancelled) return;
          setMembers(m);
        } catch {
          // lectura fallida: mantener UI actual
        }
      }

      void syncPoolFromServer();
      return () => {
        cancelled = true;
      };
    }, [user?.id, setCurrentPool, setPools]),
  );

  async function handleShare() {
    if (!user || !currentPool) return;
    setSharing(true);
    setError(null);
    setShareSuccess(false);

    const { link, error: linkError } = await generateInviteLink(user.id, currentPool.id);
    setSharing(false);

    if (linkError || !link) {
      if (linkError === 'PURCHASE_REQUIRED') {
        setError('Para invitar participantes primero necesitas comprar un plan.');
        router.push(`/(app)/purchase?upgradePoolId=${encodeURIComponent(currentPool.id)}`);
        return;
      }
      setError(linkError ?? 'No se pudo generar el link de invitación.');
      return;
    }

    const message =
      `¡Únete a mi quiniela del Mundial 2026 "${currentPool.name}"!\n` +
      `Usa este link:\n${link}`;

    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: `Únete a "${currentPool.name}"`, text: message, url: link });
          setShareSuccess(true);
        } catch {
          await copyToClipboard(message, link);
        }
      } else {
        await copyToClipboard(message, link);
      }
    } else {
      try {
        await Share.share({ message, url: link });
        setShareSuccess(true);
      } catch {
        setError('No se pudo abrir el panel de compartir.');
      }
    }
  }

  async function copyToClipboard(message: string, link: string) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        setShareSuccess(true);
      } else {
        setError(`Copia este link manualmente:\n${link}`);
      }
    } catch {
      setError(`Copia este link manualmente:\n${link}`);
    }
  }

  async function handleConfirmRemove(memberId: string) {
    if (!user || !currentPool) return;
    setRemoving(memberId);
    setRemoveError(null);
    const { error: removeErr } = await removeMember(user.id, currentPool.id, memberId);
    setRemoving(null);
    setConfirmRemoveId(null);
    if (removeErr) {
      setRemoveError(removeErr);
    } else {
      await loadData();
    }
  }

  if (!currentPool) {
    return (
      <View style={styles.emptyScreen}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="link-outline" size={36} color={colors.accent} />
        </View>
        <Text style={styles.emptyTitle}>Sin quiniela activa</Text>
        <Text style={styles.emptySubtitle}>Selecciona una quiniela desde Inicio para gestionar invitaciones.</Text>
      </View>
    );
  }

  const spotsLeft = currentPool.max_members - members.length;
  const invitesEnabled = currentPool.max_members > 1;

  return (
    <View style={styles.screen}>
      <PoolSelectorBar onPoolChange={(pool) => handlePoolSelect(pool)} />

      {/* Invite hero card — admin only */}
      {isAdmin && (
        <View style={styles.inviteHero}>
          <View style={styles.heroGlowA} />
          <View style={styles.heroGlowB} />

          <View style={styles.inviteHeroTopRow}>
            <View style={styles.inviteHeroLeft}>
              <Text style={styles.inviteHeroEyebrow}>GESTION DE INVITADOS</Text>
              <Text style={styles.inviteHeroTitle}>Invitar Participantes</Text>
              <Text style={styles.inviteHeroSub}>
                Comparte el link y llena tu quiniela con tu gente.
              </Text>
            </View>
            <View style={styles.inviteHeroRight}>
              <Ionicons name="link" size={24} color={colors.accentBright} />
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatChip}>
              <Ionicons name="people-outline" size={14} color={colors.accentBright} />
              <Text style={styles.heroStatText}>{members.length}/{currentPool.max_members}</Text>
            </View>
            <View style={styles.heroStatChip}>
              <Ionicons name="person-add-outline" size={14} color={colors.accentBright} />
              <Text style={styles.heroStatText}>
                {spotsLeft > 0 ? `${spotsLeft} disponibles` : 'Quiniela llena'}
              </Text>
            </View>
            <View style={styles.heroStatChip}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.accentBright} />
              <Text style={styles.heroStatText}>{invitesEnabled ? 'Invites ON' : 'Invites OFF'}</Text>
            </View>
          </View>

          <View style={styles.inviteHeroLeft}>
            <Text style={styles.inviteHeroSub}>
              Quiniela activa: {currentPool.name}
            </Text>
            <Text style={styles.inviteHeroSub}>
              Capacidad máxima: {currentPool.max_members} participante{currentPool.max_members !== 1 ? 's' : ''}
            </Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
              <Text style={styles.errorText}> {error}</Text>
            </View>
          )}
          {removeError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
              <Text style={styles.errorText}> {removeError}</Text>
            </View>
          )}
          {shareSuccess && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
              <Text style={styles.successText}>
                {' '}{Platform.OS === 'web' ? '¡Link copiado al portapapeles!' : '¡Invitación compartida!'}
              </Text>
            </View>
          )}

          <Button
            title={sharing ? 'Generando link…' : 'Compartir Link de Invitación'}
            icon={<Ionicons name="share-social-outline" size={18} color="#fff" />}
            onPress={handleShare}
            loading={sharing}
            style={{ marginTop: spacing.md, backgroundColor: colors.primaryLight }}
          />
        </View>
      )}

      {/* Members list */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.listHeaderLeft}>
                <Ionicons name="people" size={16} color={colors.primary} />
                <Text style={styles.listHeaderTitle}>Participantes</Text>
                <View style={styles.memberCountBadge}>
                  <Text style={styles.memberCountText}>
                    {members.length}/{currentPool.max_members}
                  </Text>
                </View>
              </View>
              <Text style={styles.listHeaderSub}>Administra miembros y controla tu cupo</Text>
            </View>
          }
          renderItem={({ item: member }) => {
            const isPendingRemove = confirmRemoveId === member.user_id;
            const isRemoving = removing === member.user_id;
            const isMe = member.user_id === user?.id;
            const initial = (member.profile?.username?.[0] ?? '?').toUpperCase();
            const isOwner = member.role === 'admin';

            return (
              <View style={styles.memberCard}>
                <View style={[styles.memberStripe, isOwner ? styles.memberStripeAdmin : styles.memberStripeMember]} />
                <View style={styles.memberRow}>
                  <View style={[styles.avatar, isMe && styles.avatarMe]}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>
                        {member.profile?.username ?? 'Desconocido'}
                      </Text>
                      {isMe && <Text style={styles.meTag}> (tú)</Text>}
                    </View>
                    <View style={[styles.roleBadge, isOwner && styles.roleBadgeAdmin]}>
                      <Text style={[styles.roleText, isOwner && styles.roleTextAdmin]}>
                        {isOwner ? 'Admin' : 'Miembro'}
                      </Text>
                    </View>
                  </View>
                  {isMe ? (
                    <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
                  ) : isAdmin ? (
                    <TouchableOpacity
                      style={styles.memberActionBtn}
                      onPress={() =>
                        setConfirmRemoveId(isPendingRemove ? null : member.user_id)
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={isPendingRemove ? 'chevron-up' : 'close-circle-outline'}
                        size={20}
                        color={isPendingRemove ? colors.textMuted : colors.error}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {isPendingRemove && (
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmText}>
                      ¿Eliminar a {member.profile?.username ?? 'este miembro'}?
                    </Text>
                    <View style={styles.confirmBtns}>
                      <TouchableOpacity
                        style={styles.confirmCancel}
                        onPress={() => setConfirmRemoveId(null)}
                      >
                        <Text style={styles.confirmCancelText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.confirmRemove}
                        onPress={() => handleConfirmRemove(member.user_id)}
                        disabled={isRemoving}
                      >
                        {isRemoving ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.confirmRemoveText}>Eliminar</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyListText}>Sin miembros aún</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  emptyScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.xs },
  emptySubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center' },

  inviteHero: {
    backgroundColor: colors.primaryDark,
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  heroGlowA: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: radius.full,
    backgroundColor: 'rgba(201,168,76,0.12)',
    top: -70,
    right: -30,
  },
  heroGlowB: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.07)',
    bottom: -55,
    left: -20,
  },
  inviteHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  inviteHeroLeft: { flex: 1 },
  inviteHeroRight: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,168,76,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.35)',
  },
  inviteHeroEyebrow: {
    ...typography.tiny,
    color: '#BFEED7',
    letterSpacing: 1.1,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  inviteHeroTitle: { ...typography.h3, color: '#fff', marginBottom: 3 },
  inviteHeroSub: { ...typography.caption, color: 'rgba(255,255,255,0.72)' },
  heroStatsRow: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  heroStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.38)',
    backgroundColor: 'rgba(13,27,42,0.22)',
  },
  heroStatText: {
    ...typography.tiny,
    color: '#FDF6DC',
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(192,57,43,0.15)',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  errorText: { ...typography.caption, color: '#ffb3ae' },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,107,53,0.25)',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  successText: { ...typography.caption, color: '#86efac', fontWeight: '600' },

  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  listHeader: { marginBottom: spacing.sm, gap: spacing.xs },
  listHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  listHeaderTitle: { ...typography.label, color: colors.text },
  listHeaderSub: { ...typography.caption, color: colors.textMuted },
  memberCountBadge: {
    backgroundColor: '#E5EEF7',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  memberCountText: { ...typography.tiny, color: colors.textMuted, fontWeight: '600' },

  memberCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#D8E4F0',
    ...shadows.sm,
  },
  memberStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  memberStripeAdmin: {
    backgroundColor: colors.accent,
  },
  memberStripeMember: {
    backgroundColor: colors.primaryLight,
  },
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarMe: { backgroundColor: colors.primary },
  avatarText: { ...typography.label, color: '#fff', fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'baseline' },
  memberName: { ...typography.bodyMd, color: colors.text },
  meTag: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.xs,
    marginTop: 3,
  },
  roleBadgeAdmin: { backgroundColor: colors.accentLight },
  roleText: { ...typography.tiny, color: colors.textMuted },
  roleTextAdmin: { color: colors.accent, fontWeight: '600' },
  memberActionBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#D6E2F1',
  },

  confirmRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmText: { ...typography.caption, color: colors.text, marginBottom: spacing.xs },
  confirmBtns: { flexDirection: 'row', gap: spacing.sm },
  confirmCancel: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  confirmCancelText: { ...typography.caption, color: colors.textMuted },
  confirmRemove: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: radius.sm,
  },
  confirmRemoveText: { ...typography.caption, color: '#fff', fontWeight: '600' },

  emptyList: { alignItems: 'center', paddingVertical: spacing.lg },
  emptyListText: { ...typography.body, color: colors.textMuted },
});
