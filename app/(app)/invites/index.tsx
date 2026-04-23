import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  Share,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import { generateInviteLink } from '@/services/invites.service';
import { getPoolMembers, removeMember } from '@/services/pools.service';
import { PoolSelectorBar } from '@/components/PoolSelectorBar';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography, radius, shadows } from '@/components/ui/theme';
import type { PoolMember, Pool } from '@/types';

export default function InvitesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentPool, pools, setCurrentPool } = usePoolStore();

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
    setCurrentPool(pool);
    setError(null);
    setRemoveError(null);
    setShareSuccess(false);
    loadData(pool);
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPool?.id]);

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
        router.push('/(app)/purchase');
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
      <PoolSelectorBar onPoolChange={(pool) => loadData(pool)} />

      {pools.length > 1 && (
        <View style={styles.switcherWrap}>
          <Text style={styles.switcherLabel}>Invitar en:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.switcherList}
          >
            {pools.map((pool) => {
              const isActive = pool.id === currentPool.id;
              return (
                <TouchableOpacity
                  key={pool.id}
                  style={[styles.poolChip, isActive && styles.poolChipActive]}
                  onPress={() => handlePoolSelect(pool)}
                >
                  <Text style={[styles.poolChipText, isActive && styles.poolChipTextActive]}>
                    {pool.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Invite hero card — admin only */}
      {isAdmin && (
        <View style={styles.inviteHero}>
          <View style={styles.inviteHeroLeft}>
            <Text style={styles.inviteHeroTitle}>Invitar Participantes</Text>
            <Text style={styles.inviteHeroSub}>
              Quiniela activa: {currentPool.name}
            </Text>
            <Text style={styles.inviteHeroSub}>
              {invitesEnabled
                ? 'Invitaciones habilitadas'
                : 'Primero compra un plan para habilitar invitaciones'}
            </Text>
            <Text style={styles.inviteHeroSub}>
              Capacidad máxima: {currentPool.max_members} participante{currentPool.max_members !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.inviteHeroSub}>
              {spotsLeft > 0
                ? `${spotsLeft} lugar${spotsLeft !== 1 ? 'es' : ''} disponible${spotsLeft !== 1 ? 's' : ''} de ${currentPool.max_members}`
                : 'Quiniela llena'}
            </Text>
          </View>
          <View style={styles.inviteHeroRight}>
            <Ionicons name="link" size={28} color={colors.accentBright} />
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
            icon="share-social-outline"
            onPress={handleShare}
            loading={sharing}
            style={{ marginTop: spacing.md }}
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
                <Text style={styles.listHeaderTitle}>Participantes</Text>
                <View style={styles.memberCountBadge}>
                  <Text style={styles.memberCountText}>
                    {members.length}/{currentPool.max_members}
                  </Text>
                </View>
              </View>
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
                      onPress={() =>
                        setConfirmRemoveId(isPendingRemove ? null : member.user_id)
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={isPendingRemove ? 'chevron-up' : 'close-circle-outline'}
                        size={24}
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
    ...shadows.md,
  },
  inviteHeroLeft: { flex: 1 },
  inviteHeroRight: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    opacity: 0.5,
  },
  inviteHeroTitle: { ...typography.h3, color: '#fff', marginBottom: 2 },
  inviteHeroSub: { ...typography.caption, color: 'rgba(255,255,255,0.6)' },
  switcherWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  switcherLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  switcherList: { gap: spacing.xs, paddingBottom: spacing.xs },
  poolChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  poolChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  poolChipText: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  poolChipTextActive: { color: '#fff' },

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
  listHeader: { marginBottom: spacing.sm },
  listHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  listHeaderTitle: { ...typography.label, color: colors.text },
  memberCountBadge: {
    backgroundColor: colors.border,
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
    ...shadows.sm,
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
