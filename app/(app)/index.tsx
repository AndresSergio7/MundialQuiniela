import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import { usePendingInviteStore } from '@/store/pendingInvite';
import { deletePoolByUser, leavePool, listMyPools } from '@/services/pools.service';
import { joinViaInvite } from '@/services/invites.service';
import { getSubmissionsForPools, countUserPredictions } from '@/services/predictions.service';
import { fetchAllMatches } from '@/services/matches.service';
import { getTournamentConfig, DEFAULT_CONFIG } from '@/lib/tournament';
import { getStandingsWithAllMembers } from '@/services/standings.service';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/UserAvatar';
import { colors, spacing, radius, shadows } from '@/components/ui/theme';
import type { Entitlement, Pool, Profile, Standing, Submission, Match } from '@/types';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuthStore();
  const { currentPool, pools, setPools, setCurrentPool } = usePoolStore();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const { poolId: pendingPoolId, token: pendingToken, clearPendingInvite } =
    usePendingInviteStore();

  const [submissions, setSubmissions] = useState<Record<string, Submission | null>>({});
  const [kickoffDate, setKickoffDate] = useState<Date>(DEFAULT_CONFIG.firstMatchKickoff);
  const [totalGroupMatches, setTotalGroupMatches] = useState(DEFAULT_CONFIG.totalMatches);
  const [filledPredictions, setFilledPredictions] = useState(0);
  const [confirmPool, setConfirmPool] = useState<Pool | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showPoolPicker, setShowPoolPicker] = useState(false);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [userStanding, setUserStanding] = useState<Standing | null>(null);
  const [todayMatches, setTodayMatches] = useState<Match[]>([]);

  const fetchPools = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const nextPools = await listMyPools(user.id);
    setPools(nextPools);
    const activePool = usePoolStore.getState().currentPool;
    if (nextPools.length === 0) {
      setCurrentPool(null);
    } else if (!activePool || !nextPools.some((p) => p.id === activePool.id)) {
      setCurrentPool(nextPools[0]);
    }
    setLoading(false);
  }, [user, setPools, setCurrentPool]);

  const fetchStandings = useCallback(async () => {
    if (!currentPool || !user) return;
    const data = await getStandingsWithAllMembers(currentPool.id);
    setStandings(data);
    setUserStanding(data.find(s => s.user_id === user.id) ?? null);
  }, [currentPool?.id, user?.id]);

  const handlePoolSelect = useCallback(async (pool: Pool) => {
    setCurrentPool(pool);
    setShowPoolPicker(false);
    if (!user) return;
    const [data, count] = await Promise.all([
      getStandingsWithAllMembers(pool.id),
      countUserPredictions(pool.id, user.id),
    ]);
    setStandings(data);
    setUserStanding(data.find(s => s.user_id === user.id) ?? null);
    setFilledPredictions(count);
  }, [setCurrentPool, user]);

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
    getTournamentConfig().then(cfg => {
      setKickoffDate(cfg.firstMatchKickoff);
      setTotalGroupMatches(cfg.totalMatches);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAllMatches().then(all => {
      if (cancelled) return;
      const todayStr = new Date().toISOString().slice(0, 10);
      const todays = all.filter(
        m => m.match_date.slice(0, 10) === todayStr || m.status === 'live',
      );
      setTodayMatches(todays.slice(0, 5));
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { fetchStandings(); }, [fetchStandings]);

  useEffect(() => {
    if (!currentPool || !user) { setFilledPredictions(0); return; }
    let cancelled = false;
    countUserPredictions(currentPool.id, user.id).then(n => {
      if (!cancelled) setFilledPredictions(n);
    });
    return () => { cancelled = true; };
  }, [currentPool?.id, user?.id]);

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
    return () => { cancelled = true; };
  }, [user]);

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

  const totalMatches = totalGroupMatches;
  const filledCount = filledPredictions;
  const remainingPredictions = Math.max(0, totalMatches - filledCount);
  const isCompactHero = width < 390;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPools} tintColor={colors.accent} />}
    >
      {/* ── HERO BANNER ── */}
      <View style={[styles.hero, { paddingTop: Math.max(insets.top, spacing.md) + spacing.xs }]}>
        <View style={styles.heroPattern}>
          <View style={styles.heroBall2} />
          <View style={styles.heroBall3} />
        </View>
        <View style={[styles.heroTopRow, isCompactHero && styles.heroTopRowCompact]}>
          {profile && (
            <View style={[styles.heroGreeting, isCompactHero && styles.heroGreetingCompact]}>
              <Text style={[styles.heroGreetingHola, isCompactHero && styles.heroGreetingHolaCompact]}>Hola,</Text>
              <Text
                style={[styles.heroGreetingName, isCompactHero && styles.heroGreetingNameCompact]}
                numberOfLines={1}
              >
                {profile.username}
              </Text>
            </View>
          )}
          <View style={[styles.heroActions, isCompactHero && styles.heroActionsCompact]}>
            <TouchableOpacity onPress={() => router.push('/(app)/rules')} style={[styles.heroIconBtn, isCompactHero && styles.heroIconBtnCompact]}>
              <Ionicons name="help-circle-outline" size={isCompactHero ? 16 : 18} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(app)/profile')} style={[styles.heroAvatarBtn, isCompactHero && styles.heroAvatarBtnCompact]}>
              <UserAvatar
                avatarUrl={profile?.avatar_url}
                name={profile?.username}
                size={isCompactHero ? 32 : 36}
                backgroundColor={colors.accent}
                textColor={colors.navy}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.heroSelectorRow, isCompactHero && styles.heroSelectorRowCompact]}>
          <TouchableOpacity
            style={[styles.heroPoolChip, isCompactHero && styles.heroPoolChipCompact]}
            onPress={() => setShowPoolPicker(true)}
            activeOpacity={0.82}
          >
            <View style={styles.heroPoolDot} />
            <Text style={[styles.heroPoolText, isCompactHero && styles.heroPoolTextCompact]} numberOfLines={1}>
              {currentPool?.name ?? 'Sin quiniela'}
            </Text>
            <Ionicons name="chevron-down" size={13} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
          <View style={[styles.heroCountdownPill, isCompactHero && styles.heroCountdownPillCompact]}>
            <View style={styles.heroPoolDot} />
            <Text style={[styles.heroCountdownText, isCompactHero && styles.heroCountdownTextCompact]}>
              {daysLeft > 0 ? `${daysLeft} DÍAS` : 'EN JUEGO'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Sin liga: CTA comprar liga ── */}
      {pools.length === 0 && !loading && (
        <View style={styles.noLigaCard}>
          <View style={styles.noLigaIcon}>
            <Ionicons name="trophy-outline" size={28} color={colors.primary} />
          </View>
          <View style={styles.noLigaText}>
            <Text style={styles.noLigaTitle}>Aún no tienes una liga</Text>
            <Text style={styles.noLigaSub}>Crea tu propia liga o únete a una existente.</Text>
          </View>
          <TouchableOpacity
            style={styles.noLigaBtn}
            onPress={() => router.push('/(app)/purchase')}
          >
            <Text style={styles.noLigaBtnText}>Comprar liga</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.navy} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Liga Activa card ── */}
      {currentPool && (
        <View style={styles.ligaCard}>
          <View style={styles.ligaCardRow}>
            <View style={styles.ligaCardCrest}>
              <Ionicons name="football-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.ligaCardInfo}>
              <Text style={styles.ligaCardLabel}>MI LIGA</Text>
              <Text style={styles.ligaCardName}>{currentPool.name}</Text>
            </View>
            <View style={styles.ligaMembersBadge}>
              <Ionicons name="people-outline" size={14} color="#9AA7A2" />
              <Text style={styles.ligaMembersText}>{Math.max(1, standings.length)}/{currentPool.max_members}</Text>
            </View>
          </View>
          {standings.length > 0 && (
            <View style={styles.ligaAvatarsRow}>
              {standings.slice(0, 6).map((s, i) => (
                <View key={s.user_id} style={[styles.ligaAvatarWrap, { zIndex: 10 - i, marginLeft: i === 0 ? 0 : -8 }]}>
                  <UserAvatar
                    avatarUrl={s.profile?.avatar_url}
                    name={s.profile?.username}
                    size={28}
                    borderColor="#fff"
                    borderWidth={2}
                    backgroundColor="#D4E8DA"
                  />
                </View>
              ))}
              {standings.length > 6 && (
                <View style={[styles.ligaAvatarWrap, styles.ligaAvatarExtra, { zIndex: 1, marginLeft: -8 }]}>
                  <Text style={styles.ligaAvatarExtraText}>+{standings.length - 6}</Text>
                </View>
              )}
            </View>
          )}
          <View style={styles.ligaProgressHeader}>
            <Text style={styles.ligaProgressLabel}>Tus predicciones</Text>
            <Text style={styles.ligaCardFraction}>{filledCount}/{totalMatches}</Text>
          </View>
          <View style={styles.ligaProgressTrack}>
            {(filledCount / totalMatches) * 100 > 0 && (
              <LinearGradient
                colors={['#2D8E5A', '#D4A017']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.ligaProgressFill, { width: `${(filledCount / totalMatches) * 100}%` as any }]}
              />
            )}
          </View>
          <View style={styles.ligaWarningRow}>
            <Ionicons
              name={filledCount >= totalMatches ? 'checkmark-circle' : 'information-circle'}
              size={13}
              color={filledCount >= totalMatches ? colors.warning : colors.error}
            />
            <Text style={[styles.ligaWarningText, filledCount >= totalMatches ? {} : { color: colors.error }]}>
              {filledCount >= totalMatches ? 'Quiniela completa' : 'Quiniela sin completar'}
            </Text>
          </View>
        </View>
      )}

      {/* ── TU POSICIÓN ── */}
      {currentPool && (
        <View style={styles.positionCard}>
          <View style={styles.positionGlow} />
          <View style={styles.positionHeaderTop}>
            <View style={styles.positionHeader}>
              <Ionicons name="flame" size={14} color={colors.accentBright} />
              <Text style={styles.positionTitle}>TU POSICIÓN</Text>
            </View>
          </View>
          <View style={styles.positionBody}>
            <View style={styles.positionLeft}>
              <Text style={styles.positionRank}>#{userStanding?.rank ?? '—'}</Text>
            </View>
            <View style={styles.positionMid}>
              <Text style={styles.positionName}>Tú</Text>
              <Text style={styles.positionMeta}>
                {userStanding?.exact_scores ?? 0} exactos · {standings.length > 0 && userStanding?.rank != null ? Math.round(((standings.length - (userStanding.rank - 1)) / standings.length) * 100) : 0}% precisión
              </Text>
            </View>
            <Text style={styles.positionPts}>{userStanding?.total_points ?? 0}</Text>
          </View>
          {(() => {
            if (!userStanding?.rank) return null;
            const above = standings.find(s => s.rank === (userStanding.rank ?? 0) - 1);
            const below = standings.find(s => s.rank === (userStanding.rank ?? 0) + 1);
            const diffAbove = above ? above.total_points - userStanding.total_points : null;
            const diffBelow = below ? userStanding.total_points - below.total_points : null;
            if (!diffAbove && !diffBelow) return null;
            return (
              <View style={styles.positionGap}>
                <Ionicons name="flame" size={12} color={colors.accentBright} />
                <Text style={styles.positionGapText}>
                  {diffAbove != null ? `${diffAbove} pts del #${above!.rank}` : ''}
                  {diffAbove != null && diffBelow != null ? ' · ' : ''}
                  {diffBelow != null ? `+${diffBelow} sobre #${below!.rank}` : ''}
                </Text>
              </View>
            );
          })()}
          <TouchableOpacity style={styles.positionCta} onPress={() => router.push('/(app)/standings')}>
            <Text style={styles.positionCtaText}>Ver tabla resultados</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.navy} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.primaryCtaWrap}>
        <TouchableOpacity
          style={styles.primaryCta}
          onPress={() => hasAccess ? router.push('/(app)/predictions') : router.push('/(app)/purchase')}
        >
          {!hasAccess && <Ionicons name="lock-closed" size={16} color={colors.navy} />}
          <Text style={styles.primaryCtaText}>
            {hasAccess ? (remainingPredictions > 0 ? `Completar ${remainingPredictions} predicciones` : 'Ver predicciones') : 'Comprar quiniela'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.navy} />
        </TouchableOpacity>
      </View>

      {todayMatches.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.liveDot} />
              <Text style={styles.sectionTitle}>EN VIVO AHORA</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(app)/live')}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveRow}>
            {todayMatches.slice(0, 4).map(match => {
              const isLive = match.status === 'live';
              return (
                <View key={match.id} style={styles.liveCard}>
                  <View style={styles.liveCardHeader}>
                    <View style={styles.liveDotSoft} />
                    <Text style={styles.liveCardMin}>{isLive ? 'EN VIVO' : 'HOY'}</Text>
                  </View>
                  <View style={styles.liveLine}>
                    <Text style={styles.liveCardTeam}>{match.home_team}</Text>
                    <Text style={styles.liveCardScore}>{isLive && match.home_score != null ? `${match.home_score}` : '—'}</Text>
                  </View>
                  <View style={styles.liveLine}>
                    <Text style={styles.liveCardTeam}>{match.away_team}</Text>
                    <Text style={styles.liveCardScore}>{isLive && match.away_score != null ? `${match.away_score}` : '—'}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Pool picker modal ── */}
      <Modal visible={showPoolPicker} transparent animationType="slide" onRequestClose={() => setShowPoolPicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowPoolPicker(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Selecciona tu quiniela</Text>
            {pools.map(pool => (
              <TouchableOpacity
                key={pool.id}
                style={[styles.pickerRow, currentPool?.id === pool.id && styles.pickerRowActive]}
                onPress={() => { handlePoolSelect(pool); }}
              >
                <Text style={[styles.pickerRowName, currentPool?.id === pool.id && styles.pickerRowNameActive]}>
                  {pool.name}
                </Text>
                {currentPool?.id === pool.id && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

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
            {deleting ? null : (
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
    backgroundColor: '#0C3D2F',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  heroPattern: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
  },
  heroBall2: {
    position: 'absolute',
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(201,168,76,0.08)',
    bottom: -30, left: -20,
  },
  heroBall3: {
    position: 'absolute',
    width: 86, height: 86, borderRadius: 43,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.32)',
    top: 24, left: 30,
  },
  heroTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroTopRowCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingRight: 0,
  },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroActionsCompact: {
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 0,
    marginLeft: spacing.sm,
  },
  heroIconBtn: {
    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  heroIconBtnCompact: {
    width: 32,
    height: 32,
    borderRadius: 11,
  },
  heroAvatarBtn: {
    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  heroAvatarBtnCompact: {
    width: 32,
    height: 32,
    borderRadius: 11,
  },
  heroAvatarText: { fontSize: 16, fontWeight: '900', color: colors.navy },
  heroAvatarTextCompact: { fontSize: 14 },
  heroSelectorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  heroSelectorRowCompact: {
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroPoolChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    flexGrow: 0, flexShrink: 1, maxWidth: '72%',
    minHeight: 34, borderRadius: 14, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2,
    backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  heroPoolChipCompact: {
    maxWidth: '64%',
    paddingHorizontal: spacing.sm,
    minHeight: 32,
  },
  heroPoolDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.accent },
  heroPoolText: { fontSize: 13, fontWeight: '800', color: '#fff', flexShrink: 1, fontFamily: 'BarlowCondensed_700Bold', letterSpacing: 0.2 },
  heroPoolTextCompact: { fontSize: 12 },
  heroCountdownPill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start',
    minHeight: 34, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2,
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroCountdownPillCompact: {
    alignSelf: 'center',
    paddingHorizontal: spacing.xs + 1,
    minHeight: 32,
    flexShrink: 0,
  },
  heroCountdownText: { fontSize: 13, color: '#fff', fontWeight: '800', fontFamily: 'BarlowCondensed_700Bold', letterSpacing: 0.3 },
  heroCountdownTextCompact: { fontSize: 12 },
  heroGreeting: {
    maxWidth: '72%',
  },
  heroGreetingCompact: { maxWidth: '76%', marginTop: spacing.xs + 2 },
  heroGreetingHola: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.75)', fontFamily: 'BarlowCondensed_600SemiBold' },
  heroGreetingHolaCompact: { fontSize: 12 },
  heroGreetingName: { fontSize: 32, fontWeight: '900', color: '#fff', lineHeight: 34, maxWidth: '100%', fontFamily: 'BarlowCondensed_900Black', letterSpacing: 0.2 },
  heroGreetingNameCompact: {
    fontSize: 21,
    lineHeight: 23,
    maxWidth: '100%',
    marginTop: 6,
  },

  // Sin liga card
  noLigaCard: {
    marginHorizontal: spacing.md, marginTop: -spacing.xxl + 6, marginBottom: spacing.md,
    backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, ...shadows.sm,
    flexDirection: 'column', gap: spacing.sm,
  },
  noLigaIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#EAF6EE', borderWidth: 1, borderColor: 'rgba(10,107,53,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  noLigaText: { flex: 1 },
  noLigaTitle: { fontSize: 15, fontWeight: '800', color: colors.text, fontFamily: 'BarlowCondensed_800ExtraBold' },
  noLigaSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontFamily: 'BarlowCondensed_600SemiBold' },
  noLigaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: colors.accent, borderRadius: radius.full,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  noLigaBtnText: { fontSize: 13, fontWeight: '900', color: colors.navy, fontFamily: 'BarlowCondensed_800ExtraBold' },

  // Liga card
  ligaCard: {
    marginHorizontal: spacing.md, marginTop: -spacing.xxl + 6, marginBottom: spacing.md,
    backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, ...shadows.sm,
  },
  ligaCardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  ligaCardCrest: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EAF6EE', borderWidth: 1, borderColor: 'rgba(10,107,53,0.24)',
    alignItems: 'center', justifyContent: 'center',
  },
  ligaCardInfo: { flex: 1 },
  ligaCardLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, fontFamily: 'BarlowCondensed_600SemiBold' },
  ligaCardName: { fontSize: 17, fontWeight: '900', color: colors.text, fontFamily: 'BarlowCondensed_800ExtraBold', lineHeight: 19 },
  ligaMembersBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F3F4F4', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6,
  },
  ligaMembersText: { fontSize: 11, color: '#4F5C57', fontWeight: '800', fontFamily: 'BarlowCondensed_700Bold' },
  ligaAvatarsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  ligaAvatarWrap: { borderRadius: 14 },
  ligaAvatarExtra: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#C8DDD1',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  ligaAvatarExtraText: { fontSize: 10, fontWeight: '900', color: '#2D6B4A', fontFamily: 'BarlowCondensed_700Bold' },
  ligaProgressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  ligaProgressLabel: { fontSize: 13, color: '#4F5C57', fontWeight: '700', fontFamily: 'BarlowCondensed_700Bold' },
  ligaCardFraction: { fontSize: 26, fontWeight: '900', color: '#0C5034', fontFamily: 'BarlowCondensed_900Black', lineHeight: 24 },
  ligaProgressTrack: { height: 4, backgroundColor: colors.borderLight, borderRadius: radius.full, overflow: 'hidden', marginTop: spacing.xs },
  ligaProgressFill: { height: 4, backgroundColor: colors.primary, borderRadius: radius.full },
  ligaWarningRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs, backgroundColor: '#F7F2E7', borderRadius: radius.md, padding: spacing.xs },
  ligaWarningText: { fontSize: 12, fontWeight: '700', color: '#9A7207', fontFamily: 'BarlowCondensed_700Bold' },

  // TU POSICIÓN
  positionCard: {
    marginHorizontal: spacing.md, marginBottom: spacing.md,
    backgroundColor: '#0D5A3A', borderRadius: 16, padding: spacing.md,
    overflow: 'hidden', ...shadows.lg,
  },
  positionGlow: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(201,168,76,0.15)', top: -60, right: -40,
  },
  positionHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  positionHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  positionTitle: { fontSize: 10, fontWeight: '800', color: colors.accentBright, letterSpacing: 1, fontFamily: 'BarlowCondensed_700Bold' },
  positionBody: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  positionLeft: { minWidth: 64, alignItems: 'center' },
  positionRank: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1, fontFamily: 'BarlowCondensed_900Black' },
  positionMid: { flex: 1, paddingHorizontal: spacing.sm },
  positionName: { fontSize: 16, fontWeight: '800', color: '#fff', fontFamily: 'BarlowCondensed_800ExtraBold' },
  positionMeta: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  positionPts: { fontSize: 28, fontWeight: '900', color: colors.accentBright, fontFamily: 'BarlowCondensed_900Black' },
  positionGap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  positionGapText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontFamily: 'BarlowCondensed_600SemiBold' },
  positionCta: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end',
    backgroundColor: colors.accent, paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: radius.full,
  },
  positionCtaText: { fontSize: 11, fontWeight: '800', color: colors.navy, fontFamily: 'BarlowCondensed_700Bold' },
  primaryCtaWrap: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  primaryCta: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.md,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.navy,
    letterSpacing: 0.2,
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  section: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: 0.4, fontFamily: 'BarlowCondensed_800ExtraBold' },
  seeAll: { fontSize: 13, fontWeight: '800', color: colors.primaryDark, fontFamily: 'BarlowCondensed_700Bold' },
  liveRow: { gap: spacing.sm, paddingBottom: spacing.xs },
  liveCard: {
    width: 210,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 2,
    ...shadows.sm,
  },
  liveCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs + 2 },
  liveDotSoft: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F87171' },
  liveCardMin: { fontSize: 10, fontWeight: '900', color: '#DC2626', letterSpacing: 0.5, fontFamily: 'BarlowCondensed_700Bold' },
  liveLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  liveCardTeam: { fontSize: 14, fontWeight: '800', color: colors.text, fontFamily: 'BarlowCondensed_600SemiBold' },
  liveCardScore: { fontSize: 16, fontWeight: '900', color: colors.text, fontFamily: 'BarlowCondensed_900Black' },

  // Pool picker
  pickerOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, paddingBottom: spacing.xxl,
  },
  pickerTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  pickerRowActive: { backgroundColor: colors.successLight, borderRadius: radius.md, paddingHorizontal: spacing.sm },
  pickerRowName: { fontSize: 15, fontWeight: '700', color: colors.text },
  pickerRowNameActive: { color: colors.primary },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: colors.overlay,
    justifyContent: 'center', alignItems: 'center', padding: spacing.lg,
  },
  confirmContent: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.xl, width: '100%', maxWidth: 380,
    alignItems: 'center', ...shadows.lg,
  },
  confirmIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.errorLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  confirmTitle: { fontSize: 20, fontWeight: '800', color: colors.error, textAlign: 'center', marginBottom: spacing.sm },
  confirmQuestion: { fontSize: 15, color: colors.text, textAlign: 'center', lineHeight: 22 },
  confirmPoolName: { fontWeight: '800' },
  confirmWarning: { fontSize: 13, color: colors.error, textAlign: 'center', marginTop: spacing.xs, fontWeight: '600' },
  errorBanner: {
    backgroundColor: colors.errorLight, borderWidth: 1,
    borderColor: colors.error + '40', borderRadius: radius.sm,
    padding: spacing.sm, width: '100%', marginTop: spacing.md,
  },
  errorText: { color: colors.error, fontSize: 13 },
  modalButtons: { flexDirection: 'row', marginTop: spacing.lg, width: '100%' },
});
