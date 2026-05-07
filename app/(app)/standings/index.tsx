import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import { getStandingsWithAllMembers } from '@/services/standings.service';
import { recalculateStandings } from '@/services/results.service';
import { getPoolMembers } from '@/services/pools.service';
import { fetchPredictionsForMember } from '@/services/predictions.service';
import { fetchAllMatches } from '@/services/matches.service';
import { exportPredictionsPdf } from '@/lib/predictionsPdf';
import { PoolSelectorBar } from '@/components/PoolSelectorBar';
import { StandingRow } from '@/components/StandingRow';
import { UserAvatar } from '@/components/UserAvatar';
import { colors, spacing, typography, radius, shadows } from '@/components/ui/theme';
import { saveRanks, loadPreviousRanks } from '@/lib/rankHistory';
import type { Standing, Pool } from '@/types';

export default function StandingsScreen() {
  const { user } = useAuthStore();
  const { currentPool } = usePoolStore();
  const [standings, setStandings] = useState<Standing[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tournamentStarted, setTournamentStarted] = useState(false);
  const [viewingPdfUserId, setViewingPdfUserId] = useState<string | null>(null);
  const [rankChanges, setRankChanges] = useState<Record<string, number>>({});

  const loadStandings = useCallback(async (pool?: Pool) => {
    const activePool = pool ?? currentPool;
    if (!activePool) return;
    setLoading(true);
    // Recalculate standings from current match results before reading the table
    try { await recalculateStandings(activePool.id); } catch { /* non-fatal */ }
    const [data, poolMembers, allMatches] = await Promise.all([
      getStandingsWithAllMembers(activePool.id),
      getPoolMembers(activePool.id),
      fetchAllMatches(),
    ]);

    // Compute rank changes vs previous snapshot
    const userIds = data.map(s => s.user_id);
    const prevRanks = await loadPreviousRanks(activePool.id, userIds);
    const changes: Record<string, number> = {};
    for (const s of data) {
      if (s.rank != null && prevRanks[s.user_id] != null) {
        changes[s.user_id] = prevRanks[s.user_id] - s.rank; // positive = moved up
      } else {
        changes[s.user_id] = 0;
      }
    }
    setRankChanges(changes);
    await saveRanks(activePool.id, data.filter(s => s.rank != null).map(s => ({ userId: s.user_id, rank: s.rank! })));

    setStandings(data);
    setMemberCount(poolMembers.length);
    const started = allMatches.some((m) => m.status === 'live' || m.status === 'finished');
    setTournamentStarted(started);
    setLoading(false);
  }, [currentPool]);

  useEffect(() => {
    loadStandings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPool?.id]);

  async function handleViewPdf(standing: Standing) {
    if (!currentPool || !tournamentStarted) return;
    if (viewingPdfUserId) return;
    setViewingPdfUserId(standing.user_id);
    try {
      const [predictions, allMatches] = await Promise.all([
        fetchPredictionsForMember(currentPool.id, standing.user_id),
        fetchAllMatches(),
      ]);
      const matchMap = new Map(allMatches.map((m) => [m.id, m]));
      const rows = predictions
        .filter((p) => matchMap.has(p.match_id))
        .map((p) => ({
          match: matchMap.get(p.match_id)!,
          homeScore: p.home_score,
          awayScore: p.away_score,
        }));
      if (rows.length === 0) {
        Alert.alert('Sin predicciones', 'Este jugador no ha llenado su quiniela.');
        return;
      }
      await exportPredictionsPdf({
        poolName: currentPool.name,
        generatedAt: new Date(),
        userLabel: standing.profile?.username,
        rows,
      });
    } catch {
      Alert.alert('Error', 'No se pudo generar el PDF.');
    } finally {
      setViewingPdfUserId(null);
    }
  }

  if (!currentPool) {
    return (
      <View style={styles.emptyScreen}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="trophy-outline" size={40} color={colors.accent} />
        </View>
        <Text style={styles.emptyTitle}>Sin quiniela activa</Text>
        <Text style={styles.emptySubtitle}>Selecciona una quiniela desde Inicio para ver la tabla.</Text>
      </View>
    );
  }

  const userStanding = standings.find((s) => s.user_id === user?.id);
  const topThree = standings
    .filter((s) => s.rank != null)
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .slice(0, 3);
  const first = topThree.find((s) => s.rank === 1) ?? topThree[0] ?? null;
  const second = topThree.find((s) => s.rank === 2) ?? topThree[1] ?? null;
  const third = topThree.find((s) => s.rank === 3) ?? topThree[2] ?? null;
  const showPodium = standings.length > 0;
  const podiumName = (standing: Standing | null) => standing?.profile?.username ?? '—';
  const podiumPoints = (standing: Standing | null) => (standing ? `${standing.total_points} pts` : '—');
  const getPrecision = (standing: Standing) =>
    standing.matches_played > 0
      ? Math.round((standing.correct_results / standing.matches_played) * 100)
      : 0;

  return (
    <View style={styles.screen}>
      <PoolSelectorBar
        contextLabel="CLASIFICACIÓN"
        rightBadgeText="Esta semana"
        showDecorations={false}
        onPoolChange={(pool) => loadStandings(pool)}
      />

      <FlatList
        data={standings}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => loadStandings()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.standingsHero}>
              <Text style={styles.standingsHeroEyebrow}>CLASIFICACIÓN</Text>
              <Text style={styles.standingsHeroTitle}>{currentPool.name}</Text>

              {showPodium && (
                <>
                  <View style={styles.standingsPodiumRow}>
                    <View style={styles.standingsPodiumEntry}>
                      <View style={[styles.podiumRankChip, styles.podiumRankChipSilver]}>
                        <Text style={styles.podiumRankChipText}>#2</Text>
                      </View>
                      <View style={[styles.standingsPodiumAvatar, styles.standingsPodiumAvatarSilver]}>
                        <UserAvatar
                          avatarUrl={second?.profile?.avatar_url}
                          name={second?.profile?.username}
                          rank={2}
                          size={76}
                          backgroundColor="#fff"
                        />
                      </View>
                      <Text style={styles.standingsPodiumName} numberOfLines={1}>{podiumName(second)}</Text>
                      <Text style={styles.standingsPodiumPoints}>{podiumPoints(second)}</Text>
                    </View>

                    <View style={styles.standingsPodiumEntryCenter}>
                      <View style={[styles.podiumRankChip, styles.podiumRankChipGold]}>
                        <Text style={styles.podiumRankChipText}>#1</Text>
                      </View>
                      <Text style={styles.standingsPodiumCrown}>♛</Text>
                      <View style={[styles.standingsPodiumAvatar, styles.standingsPodiumAvatarGold]}>
                        <UserAvatar
                          avatarUrl={first?.profile?.avatar_url}
                          name={first?.profile?.username}
                          rank={1}
                          size={76}
                          backgroundColor="#fff"
                        />
                      </View>
                      <Text style={styles.standingsPodiumName} numberOfLines={1}>{podiumName(first)}</Text>
                      <Text style={styles.standingsPodiumPoints}>{podiumPoints(first)}</Text>
                    </View>

                    <View style={styles.standingsPodiumEntry}>
                      <View style={[styles.podiumRankChip, styles.podiumRankChipBronze]}>
                        <Text style={styles.podiumRankChipText}>#3</Text>
                      </View>
                      <View style={[styles.standingsPodiumAvatar, styles.standingsPodiumAvatarBronze]}>
                        <UserAvatar
                          avatarUrl={third?.profile?.avatar_url}
                          name={third?.profile?.username}
                          rank={3}
                          size={76}
                          backgroundColor="#fff"
                        />
                      </View>
                      <Text style={styles.standingsPodiumName} numberOfLines={1}>{podiumName(third)}</Text>
                      <Text style={styles.standingsPodiumPoints}>{podiumPoints(third)}</Text>
                    </View>
                  </View>

                  <View style={styles.pedestalRow}>
                    <View style={[styles.pedestalBox, styles.pedestalSilver]}><Text style={styles.pedestalNum}>2</Text></View>
                    <View style={[styles.pedestalBox, styles.pedestalGold]}><Text style={styles.pedestalNum}>1</Text></View>
                    <View style={[styles.pedestalBox, styles.pedestalBronze]}><Text style={styles.pedestalNum}>3</Text></View>
                  </View>
                </>
              )}

              {userStanding && (
                <View style={styles.mySummaryCard}>
                  <View style={styles.mySummaryTop}>
                    <Text style={styles.mySummaryRank}>{userStanding.rank != null ? `#${userStanding.rank}` : '—'}</Text>
                    <View style={styles.mySummaryUser}>
                      <Text style={styles.mySummaryName}>Tú</Text>
                      <Text style={styles.mySummaryMeta}>
                        {userStanding.exact_scores} exactos · {getPrecision(userStanding)}% precisión
                      </Text>
                    </View>
                    <View style={styles.mySummaryPointsWrap}>
                      <Text style={styles.mySummaryPoints}>{userStanding.total_points}</Text>
                      <Text style={styles.mySummaryPts}>PUNTOS</Text>
                    </View>
                  </View>
                  <View style={styles.mySummaryBottom}>
                    <Ionicons name="flame" size={15} color={colors.accent} />
                    <Text style={styles.mySummaryBottomText}>
                      {(() => {
                        const below = standings.find((s) => s.rank === (userStanding.rank ?? 0) + 1);
                        if (!below) return 'Sigue así, vas fuerte';
                        const diff = userStanding.total_points - below.total_points;
                        return diff > 0 ? `+${diff} pts sobre #${below.rank} · Aún puedes ganar` : 'La tabla está muy cerrada';
                      })()}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <Text style={styles.tableCompleteTitle}>TABLA COMPLETA</Text>

            {loading && (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
            )}
          </View>
        }
        renderItem={({ item, index }) => {
          const isGenerating = viewingPdfUserId === item.user_id;
          return (
            <View style={styles.rowWrap}>
              {isGenerating && (
                <View style={styles.pdfLoadingOverlay}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.pdfLoadingText}>Generando PDF…</Text>
                </View>
              )}
              <StandingRow
                standing={item}
                isCurrentUser={item.user_id === user?.id}
                canViewPdf={tournamentStarted}
                rankChange={rankChanges[item.user_id] ?? 0}
                isFirst={index === 0}
                isLast={index === standings.length - 1}
                onPress={() => handleViewPdf(item)}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyList}>
              <View style={styles.emptyListIcon}>
                <Ionicons name="trophy-outline" size={32} color={colors.accent} />
              </View>
              <Text style={styles.emptyListTitle}>Tabla vacía</Text>
              <Text style={styles.emptyListSub}>
                Los participantes aparecerán aquí cuando envíen su quiniela.
              </Text>
            </View>
          ) : null
        }
      />
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

  standingsHero: {
    backgroundColor: '#0B4A2E',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    overflow: 'hidden',
  },
  standingsHeroEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.accentBright,
    letterSpacing: 2,
    fontFamily: 'BarlowCondensed_700Bold',
  },
  standingsHeroTitle: {
    marginTop: spacing.xs,
    fontSize: 18,
    lineHeight: 22,
    color: '#fff',
    fontWeight: '900',
    fontFamily: 'BarlowCondensed_900Black',
  },
  standingsPodiumRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  standingsPodiumEntry: { flex: 1, alignItems: 'center' },
  standingsPodiumEntryCenter: { flex: 1.2, alignItems: 'center' },
  podiumRankChip: {
    minWidth: 34,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  podiumRankChipGold: {
    backgroundColor: 'rgba(212,160,23,0.26)',
    borderColor: 'rgba(212,160,23,0.6)',
  },
  podiumRankChipSilver: {
    backgroundColor: 'rgba(187,196,200,0.24)',
    borderColor: 'rgba(187,196,200,0.6)',
  },
  podiumRankChipBronze: {
    backgroundColor: 'rgba(193,129,61,0.24)',
    borderColor: 'rgba(193,129,61,0.6)',
  },
  podiumRankChipText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '900',
    fontFamily: 'BarlowCondensed_800ExtraBold',
    letterSpacing: 0.2,
  },
  standingsPodiumCrown: {
    fontSize: 20,
    color: colors.accentBright,
    marginBottom: spacing.xs,
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  standingsPodiumAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    backgroundColor: '#fff',
  },
  standingsPodiumAvatarGold: { borderColor: '#D4A017' },
  standingsPodiumAvatarSilver: { borderColor: '#AEB6B8' },
  standingsPodiumAvatarBronze: { borderColor: '#BD7B38' },
  standingsPodiumAvatarGlyph: {
    fontSize: 30,
    color: colors.navy,
    fontWeight: '800',
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  standingsPodiumName: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 16,
    color: '#fff',
    fontWeight: '900',
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  standingsPodiumPoints: {
    marginTop: 2,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
    fontFamily: 'BarlowCondensed_700Bold',
  },
  pedestalRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-end',
    height: 200,
  },
  pedestalBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  pedestalGold: { flex: 1.2, height: 180, backgroundColor: '#C69A1A' },
  pedestalSilver: { height: 146, backgroundColor: '#A6B0B0' },
  pedestalBronze: { height: 120, backgroundColor: '#C1813D' },
  pedestalNum: {
    fontSize: 64,
    color: '#fff',
    fontWeight: '900',
    fontFamily: 'BarlowCondensed_900Black',
    letterSpacing: -2,
  },
  mySummaryCard: {
    marginTop: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#D4A017',
    padding: spacing.md,
  },
  mySummaryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mySummaryRank: {
    fontSize: 40,
    color: '#C69A1A',
    fontWeight: '900',
    lineHeight: 40,
    fontFamily: 'BarlowCondensed_900Black',
  },
  mySummaryUser: { flex: 1 },
  mySummaryName: {
    fontSize: 20,
    lineHeight: 20,
    color: colors.navy,
    fontWeight: '900',
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  mySummaryMeta: {
    marginTop: 2,
    fontSize: 13,
    color: '#4E6473',
    fontWeight: '700',
    fontFamily: 'BarlowCondensed_700Bold',
  },
  mySummaryPointsWrap: { alignItems: 'flex-end' },
  mySummaryPoints: {
    fontSize: 42,
    color: '#0A5033',
    fontWeight: '900',
    lineHeight: 40,
    fontFamily: 'BarlowCondensed_900Black',
  },
  mySummaryPts: {
    fontSize: 12,
    color: '#5F7586',
    fontWeight: '800',
    fontFamily: 'BarlowCondensed_700Bold',
  },
  mySummaryBottom: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: '#F6F1E6',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  mySummaryBottomText: {
    flex: 1,
    fontSize: 14,
    color: '#8A6600',
    fontWeight: '800',
    fontFamily: 'BarlowCondensed_700Bold',
  },
  tableCompleteTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.md,
    fontSize: 26,
    letterSpacing: 1.5,
    color: '#3E4F5A',
    fontWeight: '900',
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },

  heroWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  heroCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    padding: spacing.md,
    overflow: 'hidden',
    ...shadows.lg,
  },
  heroGlowA: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: radius.full,
    top: -52,
    right: -34,
    backgroundColor: 'rgba(201,168,76,0.22)',
  },
  heroGlowB: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: radius.full,
    bottom: -45,
    left: -18,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroEyebrow: {
    ...typography.tiny,
    color: '#9CC0EE',
    letterSpacing: 1,
    fontWeight: '800',
  },
  heroTitle: {
    marginTop: spacing.xs,
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  heroSub: {
    marginTop: 2,
    ...typography.caption,
    color: 'rgba(255,255,255,0.72)',
  },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.65)',
    backgroundColor: 'rgba(201,168,76,0.18)',
  },
  syncChipActive: {
    backgroundColor: 'rgba(201,168,76,0.28)',
  },
  syncText: { ...typography.tiny, color: colors.accentLight, fontWeight: '700' },
  syncTextActive: { color: '#fff' },
  metricsRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metricChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 1,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.4)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  metricText: {
    ...typography.tiny,
    color: '#F4F7FE',
    fontWeight: '700',
    flexShrink: 1,
  },
  progressTrack: {
    marginTop: spacing.sm,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.accentBright,
    borderRadius: radius.full,
  },

  myCardWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  myCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radius.lg,
    padding: spacing.md,
    overflow: 'hidden',
    ...shadows.lg,
  },
  myAura: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: radius.full,
    left: -36,
    top: -28,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  myCardLeft: { alignItems: 'center', minWidth: 64 },
  myCardTag: {
    ...typography.tiny,
    color: colors.accentBright,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  myRank: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  myDivider: {
    width: 1,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: spacing.md,
  },
  myCardRight: { flex: 1 },
  myPoints: { fontSize: 28, fontWeight: '800', color: colors.accentBright, lineHeight: 32 },
  myPtsLabel: { ...typography.tiny, color: 'rgba(255,255,255,0.6)', marginBottom: spacing.xs },
  myMeta: { ...typography.caption, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  myCardBadge: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 3,
  },
  myCardBadgeText: {
    ...typography.tiny,
    color: colors.navy,
    fontWeight: '800',
  },

  // Notes
  notesWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  notesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  notesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  editNotesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(10,107,53,0.35)',
    backgroundColor: '#EAF6EE',
  },
  editNotesBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  notesBody: { fontSize: 14, color: colors.text, lineHeight: 20 },
  notesBodyEmpty: { color: colors.textMuted, fontStyle: 'italic' },
  notesInput: {
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: colors.surfaceMuted,
  },
  notesActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  notesCancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesCancelText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  notesSaveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  notesSaveBtnDisabled: { opacity: 0.6 },
  notesSaveText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  pdfHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: '#C5D8F0',
    alignSelf: 'flex-start',
  },
  pdfHintText: { fontSize: 12, color: colors.primary, fontWeight: '600' },

  pdfLoadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pdfLoadingText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },

  list: { paddingBottom: spacing.xxl * 2 },
  rowWrap: { marginHorizontal: spacing.md },

  emptyList: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyListIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyListTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.xs },
  emptyListSub: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Podium
  podiumWrap: {
    backgroundColor: colors.primaryDark, overflow: 'hidden',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 0,
  },
  podiumGlowA: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(201,168,76,0.12)', top: -60, right: -60,
  },
  podiumGlowB: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 0, left: -40,
  },
  podiumEyebrow: { fontSize: 10, fontWeight: '800', color: colors.accentBright, letterSpacing: 1.5, marginBottom: 2 },
  podiumTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: spacing.lg },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  podiumItem: { alignItems: 'center', flex: 1 },
  podiumCrown: { fontSize: 20, marginBottom: 4 },
  podiumAvatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6, borderWidth: 2,
  },
  podiumAvatarGold: { backgroundColor: colors.accent, borderColor: colors.accentBright },
  podiumAvatarSilver: { backgroundColor: colors.silver, borderColor: '#CBD5E1' },
  podiumAvatarBronze: { backgroundColor: colors.bronze, borderColor: '#D4915A' },
  podiumAvatarText: { fontSize: 22, fontWeight: '900', color: '#fff' },
  podiumUsername: { fontSize: 12, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 2 },
  podiumPts: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
  podiumPedestal: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  podiumPedestalGold: { height: 52, backgroundColor: colors.accent },
  podiumPedestalSilver: { height: 38, backgroundColor: colors.silver },
  podiumPedestalBronze: { height: 28, backgroundColor: colors.bronze },
  podiumPedestalNum: { fontSize: 22, fontWeight: '900', color: '#fff' },
});
