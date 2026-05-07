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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import { generateInviteLink } from '@/services/invites.service';
import { fetchPoolById, getPoolMembers, listMyPools, removeMember } from '@/services/pools.service';
import { PoolSelectorBar } from '@/components/PoolSelectorBar';
import { UserAvatar } from '@/components/UserAvatar';
import { colors, spacing, typography, radius, shadows } from '@/components/ui/theme';
import { POOL_PLANS } from '@/types';
import type { PoolMember, Pool } from '@/types';

const AVATAR_COLORS = ['#E91E63','#9C27B0','#3F51B5','#2196F3','#00897B','#FF7043','#5D4037','#546E7A'];
function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

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
  const [inviteLink, setInviteLink] = useState('');

  const isAdmin = currentPool?.admin_id === user?.id;

  async function loadData(pool?: Pool) {
    const activePool = pool ?? currentPool;
    if (!activePool) return;
    setLoading(true);
    setError(null);
    try {
      const m = await getPoolMembers(activePool.id);
      setMembers(m);
      if (user && activePool.admin_id === user.id) {
        const { link } = await generateInviteLink(user.id, activePool.id);
        if (link) setInviteLink(link);
      } else {
        setInviteLink('');
      }
    } catch {
      setError('No se pudo cargar la información de la liga.');
    } finally {
      setLoading(false);
    }
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

  async function handleShare(mode: 'system' | 'whatsapp' = 'system') {
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
    setInviteLink(link);

    if (mode === 'whatsapp') {
      try {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        await Linking.openURL(waUrl);
        setShareSuccess(true);
      } catch {
        setError('No se pudo abrir WhatsApp para compartir.');
      }
      return;
    }

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

  async function handleCopyInvite() {
    if (!currentPool || !user) return;
    setError(null);
    setShareSuccess(false);
    let linkToCopy = inviteLink;
    if (!linkToCopy) {
      const { link, error: linkError } = await generateInviteLink(user.id, currentPool.id);
      if (linkError || !link) {
        setError(linkError ?? 'No se pudo generar el link de invitación.');
        return;
      }
      linkToCopy = link;
      setInviteLink(link);
    }
    const message =
      `¡Únete a mi quiniela del Mundial 2026 "${currentPool.name}"!\n` +
      `Usa este link:\n${linkToCopy}`;
    await copyToClipboard(message, linkToCopy);
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
  const currentPlanIdx = POOL_PLANS.findIndex(p => p.slots === currentPool.max_members);
  const nextPlan = currentPlanIdx >= 0 && currentPlanIdx < POOL_PLANS.length - 1
    ? POOL_PLANS[currentPlanIdx + 1]
    : null;
  const memberPreview = members.slice(0, 5);
  const extraMembers = Math.max(0, members.length - memberPreview.length);
  const displayInviteLink =
    inviteLink || `quiniela.app/join/${(currentPool.name ?? 'liga').replace(/\s+/g, '-').toUpperCase()}`;

  return (
    <View style={styles.screen}>
      <PoolSelectorBar
        contextLabel="INVITACIONES"
        rightBadgeText={`${members.length}/${currentPool.max_members}`}
        onPoolChange={(pool) => handlePoolSelect(pool)}
      />

      {/* Members list */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              {isAdmin && (
                <View style={styles.inviteSection}>
                  <View style={styles.inviteHero}>
                    <View style={styles.heroGlowA} />
                    <View style={styles.heroGlowB} />
                    <Text style={styles.inviteHeroEyebrow}>INVITA A TU LIGA</Text>
                    <Text style={styles.inviteHeroLeagueName}>{currentPool.name}</Text>
                    <Text style={styles.inviteHeroSub}>Comparte el link y compite con tus amigos</Text>

                    <View style={styles.membersSummaryRow}>
                      <View style={styles.avatarStackRow}>
                        {memberPreview.map((member, idx) => (
                          <View key={member.id} style={{ marginLeft: idx === 0 ? 0 : -10, zIndex: 10 - idx }}>
                            <UserAvatar
                              avatarUrl={member.profile?.avatar_url}
                              name={member.profile?.username}
                              size={36}
                              borderColor="#0C402A"
                              borderWidth={2}
                              backgroundColor={avatarColor(member.profile?.username ?? member.id)}
                            />
                          </View>
                        ))}
                        {extraMembers > 0 && (
                          <View style={[styles.stackAvatar, styles.stackAvatarExtra, { marginLeft: -10 }]}>
                            <Text style={styles.stackAvatarExtraText}>+{extraMembers}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.summaryRight}>
                        <Text style={styles.summaryRightTitle}>{members.length}/{currentPool.max_members} jugadores</Text>
                        <Text style={styles.summaryRightSubtitle}>
                          {spotsLeft > 0 ? `🔥 Solo ${spotsLeft} cupos restantes` : '✅ Cupos completos'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.linkRow}>
                      <View style={styles.linkTextWrap}>
                        <Text style={styles.linkLabel}>LINK DE INVITACIÓN</Text>
                        <Text style={styles.linkValue} numberOfLines={1}>{displayInviteLink}</Text>
                      </View>
                      <TouchableOpacity style={styles.copyBtn} onPress={handleCopyInvite} disabled={sharing}>
                        <Ionicons name="copy-outline" size={18} color="#102A43" />
                        <Text style={styles.copyBtnText}>Copiar</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.whatsappBtn}
                      onPress={() => handleShare('whatsapp')}
                      disabled={sharing}
                    >
                      {sharing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                          <Text style={styles.whatsappBtnText}>Compartir en WhatsApp</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {(error || removeError || shareSuccess) && (
                    <View style={{ marginTop: spacing.sm }}>
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
                    </View>
                  )}
                </View>
              )}

              {isAdmin && (
                <>
                  {nextPlan && (
                    <TouchableOpacity
                      style={styles.upgradeBanner}
                      onPress={() => router.push(`/(app)/purchase?upgradePoolId=${encodeURIComponent(currentPool.id)}`)}
                    >
                      <View style={styles.upgradeBadge}>
                        <Ionicons name="sparkles-outline" size={16} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.upgradeTitle}>¿Necesitas más cupos?</Text>
                        <Text style={styles.upgradeSub}>Sube a {nextPlan.slots} jugadores · {nextPlan.priceLabel}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                </>
              )}

              <View style={styles.listHeader}>
                <Text style={styles.listHeaderTitle}>EN LA LIGA · {members.length}</Text>
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
                   <UserAvatar
                     avatarUrl={member.profile?.avatar_url}
                     name={member.profile?.username}
                     size={48}
                     backgroundColor={isMe ? '#ECEFF1' : avatarColor(member.profile?.username ?? member.id)}
                   />
                   <View style={styles.memberInfo}>
                     <View style={styles.memberNameRow}>
                       <Text style={styles.memberName}>
                         {member.profile?.username ?? 'Desconocido'}
                       </Text>
                       {isMe && <Text style={styles.meTag}> TÚ</Text>}
                     </View>
                     <Text style={styles.memberStatus}>{isOwner ? 'Admin · Activo' : 'Activo'}</Text>
                   </View>
                   {isOwner ? (
                     <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>ADMIN</Text></View>
                   ) : isAdmin && !isMe ? (
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg + 2,
    marginHorizontal: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: 0,
    borderRadius: 20,
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
    fontSize: 13,
    color: colors.accentBright,
    letterSpacing: 3,
    fontWeight: '900',
    fontFamily: 'BarlowCondensed_700Bold',
    marginBottom: spacing.xs,
  },
  inviteHeroLeagueName: {
    fontSize: 28,
    lineHeight: 32,
    color: '#fff',
    fontWeight: '900',
    fontFamily: 'BarlowCondensed_900Black',
    marginBottom: spacing.xs,
  },
  inviteHeroSub: {
    fontSize: 16,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.86)',
    fontFamily: 'BarlowCondensed_500Medium',
    marginBottom: spacing.md,
  },
  membersSummaryRow: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  avatarStackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#0C402A',
    backgroundColor: '#E8ECEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackAvatarText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '900',
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  stackAvatarExtra: { backgroundColor: '#fff' },
  stackAvatarExtraText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '900',
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  summaryRight: { flex: 1, marginLeft: spacing.sm },
  summaryRightTitle: {
    fontSize: 18,
    color: '#fff',
    lineHeight: 20,
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  summaryRightSubtitle: {
    fontSize: 14,
    lineHeight: 16,
    color: colors.accentBright,
    fontFamily: 'BarlowCondensed_700Bold',
  },
  linkRow: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(10,42,28,0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  linkTextWrap: { flex: 1 },
  linkLabel: {
    fontSize: 13,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'BarlowCondensed_700Bold',
  },
  linkValue: {
    marginTop: 2,
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  copyBtn: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    borderRadius: 13,
    backgroundColor: '#D9A90F',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  copyBtnText: {
    color: '#0E1E2E',
    fontSize: 14,
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  whatsappBtn: {
    marginTop: spacing.lg,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#2ECC5D',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  whatsappBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
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

  upgradeBanner: {
    marginHorizontal: spacing.xs,
    marginTop: spacing.sm,
    minHeight: 84,
    borderRadius: 18,
    backgroundColor: '#C99712',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  upgradeBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  upgradeSub: {
    color: '#FFF3D0',
    fontSize: 14,
    fontFamily: 'BarlowCondensed_500Medium',
  },

  list: { paddingHorizontal: spacing.sm, paddingBottom: spacing.xxl, paddingTop: spacing.xs },
  listHeader: { marginBottom: spacing.sm, marginTop: spacing.md },
  listHeaderTitle: {
    fontSize: 18,
    color: '#384C5B',
    letterSpacing: 2,
    lineHeight: 20,
    fontFamily: 'BarlowCondensed_700Bold',
  },
  memberCountBadge: {
    backgroundColor: '#E5EEF7',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  memberCountText: { ...typography.tiny, color: colors.textMuted, fontWeight: '600' },

  memberCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: '#E8EEF5',
  },
  memberStatus: {
    marginTop: 2,
    color: '#6B7C89',
    fontSize: 14,
    fontFamily: 'BarlowCondensed_500Medium',
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
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: '#ECEFF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarMe: { backgroundColor: '#ECEFF1' },
  avatarText: { fontSize: 20, color: colors.text, fontFamily: 'BarlowCondensed_700Bold' },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'baseline' },
  memberName: { fontSize: 17, color: colors.text, fontFamily: 'BarlowCondensed_700Bold' },
  meTag: { fontSize: 14, color: '#C58F12', fontFamily: 'BarlowCondensed_700Bold' },
  adminBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#F5E7BB',
  },
  adminBadgeText: {
    color: '#A1780E',
    fontSize: 12,
    fontFamily: 'BarlowCondensed_800ExtraBold',
    letterSpacing: 1,
  },
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E2F1',
  },

  confirmRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#D7DEE6',
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
