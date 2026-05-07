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
  Modal,
  ScrollView,
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
import type { Standing, Match, Pool } from '@/types';

type PdfRow = { match: Match; homeScore: number; awayScore: number };

export default function StandingsScreen() {
  const { user } = useAuthStore();
  const { currentPool } = usePoolStore();
  const [standings, setStandings] = useState<Standing[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tournamentStarted, setTournamentStarted] = useState(false);
  const [rankChanges, setRankChanges] = useState<Record<string, number>>({});
  const [matchProgress, setMatchProgress] = useState<{ played: number; total: number } | null>(null);
  const [allMatchesCache, setAllMatchesCache] = useState<Match[]>([]);

  // Quiniela viewer modal
  const [viewingQuiniela, setViewingQuiniela] = useState<{ standing: Standing; rows: PdfRow[] } | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const loadStandings = useCallback(async (pool?: Pool) => {
    const activePool = pool ?? currentPool;
    if (!activePool) return;
    setLoading(true);
    try { await recalculateStandings(activePool.id); } catch { /* non-fatal */ }
    const [data, poolMembers, allMatches] = await Promise.all([
      getStandingsWithAllMembers(activePool.id),
      getPoolMembers(activePool.id),
      fetchAllMatches(),
    ]);

    const userIds = data.map(s => s.user_id);
    const prevRanks = await loadPreviousRanks(activePool.id, userIds);
    const changes: Record<string, number> = {};
    for (const s of data) {
      if (s.rank != null && prevRanks[s.user_id] != null) {
        changes[s.user_id] = prevRanks[s.user_id] - s.rank;
      } else {
        changes[s.user_id] = 0;
      }
    }
    setRankChanges(changes);
    await saveRanks(activePool.id, data.filter(s => s.rank != null).map(s => ({ userId: s.user_id, rank: s.rank! })));

    setStandings(data);
    setMemberCount(poolMembers.length);
    setAllMatchesCache(allMatches);

    const played = allMatches.filter(m => m.status === 'finished').length;
    setMatchProgress({ played, total: allMatches.length });

    const started = allMatches.some((m) => m.status === 'live' || m.status === 'finished');
    setTournamentStarted(started);
    setLoading(false);
  }, [currentPool]);

  useEffect(() => {
    loadStandings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPool?.id]);

  async function handleViewStanding(standing: Standing) {
    if (!currentPool || viewingLoading) return;
    setViewingLoading(true);
    try {
      const predictions = await fetchPredictionsForMember(currentPool.id, standing.user_id);
      const matchMap = new Map(allMatchesCache.map((m) => [m.id, m]));
      const rows: PdfRow[] = predictions
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
      setViewingQuiniela({ standing, rows });
    } catch {
      Alert.alert('Error', 'No se pudo cargar la quiniela.');
    } finally {
      setViewingLoading(false);
    }
  }

  async function handleExportPdfFromModal() {
    if (!viewingQuiniela || !currentPool) return;
    setExportingPdf(true);
    try {
      await exportPredictionsPdf({
        poolName: currentPool.name,
        generatedAt: new Date(),
        userLabel: viewingQuiniela.standing.profile?.username,
        rows: viewingQuiniela.rows,
      });
    } catch {
      Alert.alert('Error', 'No se pudo generar el PDF.');
    } finally {
      setExportingPdf(false);
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
  const podiumName = (standing: Standing | null) =>
    standing?.profile?.full_name ?? standing?.profile?.username ?? '—';
  const podiumPoints = (standing: Standing | null) => (standing ? `${standing.total_points} pts` : '—');
  const getPrecision = (standing: Standing) =>
    standing.matches_played > 0
      ? Math.round((standing.correct_results / standing.matches_played) * 100)
      : 0;

  return (
    <View style={styles.screen}>
      <PoolSelectorBar
        contextLabel="CLASIFICACIÓN"
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
              <View style={styles.standingsHeroTopRow}>
                <View>
                  <Text style={styles.standingsHeroEyebrow}>CLASIFICACIÓN</Text>
                  <Text style={styles.standingsHeroTitle}>{currentPool.name}</Text>
                </View>
                {matchProgress && (
                  <View style={styles.matchProgressPill}>
                    <Ionicons name="football-outline" size={12} color={colors.accentBright} />
                    <Text style={styles.matchProgressText}>
                      {matchProgress.played}/{matchProgress.total}
                    </Text>
                    <Text style={styles.matchProgressLabel}>partidos</Text>
                  </View>
                )}
              </View>

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
          const isLoading = viewingLoading && !viewingQuiniela;
          return (
            <View style={styles.rowWrap}>
              <StandingRow
                standing={item}
                isCurrentUser={item.user_id === user?.id}
                canViewPdf={tournamentStarted}
                rankChange={rankChanges[item.user_id] ?? 0}
                isFirst={index === 0}
                isLast={index === standings.length - 1}
                onPress={() => handleViewStanding(item)}
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

      {/* Loading overlay while fetching quiniela */}
      {viewingLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingOverlayText}>Cargando quiniela…</Text>
        </View>
      )}

      {/* Quiniela viewer modal */}
      <Modal
        visible={viewingQuiniela !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setViewingQuiniela(null)}
      >
        <View style={styles.quinielaModalOverlay}>
          <View style={styles.quinielaModalSheet}>
            {/* Header */}
            <View style={styles.quinielaModalHeader}>
              <View style={styles.quinielaModalUserInfo}>
                <UserAvatar
                  avatarUrl={viewingQuiniela?.standing.profile?.avatar_url}
                  name={viewingQuiniela?.standing.profile?.username}
                  size={40}
                />
                <View style={styles.quinielaModalUserText}>
                  <Text style={styles.quinielaModalUserName} numberOfLines={1}>
                    {viewingQuiniela?.standing.profile?.full_name ?? viewingQuiniela?.standing.profile?.username ?? '—'}
                  </Text>
                  {viewingQuiniela?.standing.profile?.full_name && (
                    <Text style={styles.quinielaModalUserHandle}>
                      @{viewingQuiniela.standing.profile.username}
                    </Text>
                  )}
                </View>
                <View style={styles.quinielaModalPoints}>
                  <Text style={styles.quinielaModalPointsNum}>{viewingQuiniela?.standing.total_points}</Text>
                  <Text style={styles.quinielaModalPointsLabel}>pts</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.quinielaModalCloseBtn} onPress={() => setViewingQuiniela(null)}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Predictions list */}
            <ScrollView style={styles.quinielaModalScroll} contentContainerStyle={styles.quinielaModalScrollContent}>
              {viewingQuiniela?.rows.map((row, i) => (
                <View key={row.match.id} style={[styles.quinielaMatchRow, i === 0 && styles.quinielaMatchRowFirst]}>
                  <View style={styles.quinielaMatchInfo}>
                    <Text style={styles.quinielaMatchGroup}>{row.match.group_name}</Text>
                    <Text style={styles.quinielaMatchTeams} numberOfLines={1}>
                      {row.match.home_team} vs {row.match.away_team}
                    </Text>
                  </View>
                  <View style={styles.quinielaScoreBox}>
                    <Text style={styles.quinielaScoreNum}>{row.homeScore}</Text>
                    <Text style={styles.quinielaScoreSep}>–</Text>
                    <Text style={styles.quinielaScoreNum}>{row.awayScore}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Footer with PDF button */}
            <View style={styles.quinielaModalFooter}>
              <TouchableOpacity
                style={[styles.quinielaDownloadBtn, exportingPdf && styles.quinielaDownloadBtnDisabled]}
                onPress={handleExportPdfFromModal}
                disabled={exportingPdf}
              >
                {exportingPdf ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="document-text-outline" size={16} color="#fff" />
                )}
                <Text style={styles.quinielaDownloadBtnText}>
                  {exportingPdf ? 'Generando…' : 'Descargar PDF'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  standingsHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
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
  matchProgressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  matchProgressText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  matchProgressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'BarlowCondensed_600SemiBold',
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
    minWidth: 34, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs, borderWidth: 1,
  },
  podiumRankChipGold: {
    backgroundColor: 'rgba(212,160,23,0.26)', borderColor: 'rgba(212,160,23,0.6)',
  },
  podiumRankChipSilver: {
    backgroundColor: 'rgba(187,196,200,0.24)', borderColor: 'rgba(187,196,200,0.6)',
  },
  podiumRankChipBronze: {
    backgroundColor: 'rgba(193,129,61,0.24)', borderColor: 'rgba(193,129,61,0.6)',
  },
  podiumRankChipText: {
    fontSize: 12, color: '#fff', fontWeight: '900',
    fontFamily: 'BarlowCondensed_800ExtraBold', letterSpacing: 0.2,
  },
  standingsPodiumCrown: {
    fontSize: 20, color: colors.accentBright,
    marginBottom: spacing.xs, fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  standingsPodiumAvatar: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, backgroundColor: '#fff',
  },
  standingsPodiumAvatarGold: { borderColor: '#D4A017' },
  standingsPodiumAvatarSilver: { borderColor: '#AEB6B8' },
  standingsPodiumAvatarBronze: { borderColor: '#BD7B38' },
  standingsPodiumName: {
    marginTop: spacing.sm, fontSize: 14, lineHeight: 16,
    color: '#fff', fontWeight: '900', fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  standingsPodiumPoints: {
    marginTop: 2, fontSize: 11, color: 'rgba(255,255,255,0.8)',
    fontWeight: '700', fontFamily: 'BarlowCondensed_700Bold',
  },
  pedestalRow: {
    marginTop: spacing.md, flexDirection: 'row',
    gap: spacing.xs, alignItems: 'flex-end', height: 200,
  },
  pedestalBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  pedestalGold: { flex: 1.2, height: 180, backgroundColor: '#C69A1A' },
  pedestalSilver: { height: 146, backgroundColor: '#A6B0B0' },
  pedestalBronze: { height: 120, backgroundColor: '#C1813D' },
  pedestalNum: {
    fontSize: 64, color: '#fff', fontWeight: '900',
    fontFamily: 'BarlowCondensed_900Black', letterSpacing: -2,
  },
  mySummaryCard: {
    marginTop: spacing.md, backgroundColor: '#FFFFFF',
    borderRadius: 18, borderWidth: 2, borderColor: '#D4A017', padding: spacing.md,
  },
  mySummaryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mySummaryRank: {
    fontSize: 40, color: '#C69A1A', fontWeight: '900',
    lineHeight: 40, fontFamily: 'BarlowCondensed_900Black',
  },
  mySummaryUser: { flex: 1 },
  mySummaryName: {
    fontSize: 20, lineHeight: 20, color: colors.navy,
    fontWeight: '900', fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  mySummaryMeta: {
    marginTop: 2, fontSize: 13, color: '#4E6473',
    fontWeight: '700', fontFamily: 'BarlowCondensed_700Bold',
  },
  mySummaryPointsWrap: { alignItems: 'flex-end' },
  mySummaryPoints: {
    fontSize: 42, color: '#0A5033', fontWeight: '900',
    lineHeight: 40, fontFamily: 'BarlowCondensed_900Black',
  },
  mySummaryPts: {
    fontSize: 12, color: '#5F7586', fontWeight: '800',
    fontFamily: 'BarlowCondensed_700Bold',
  },
  mySummaryBottom: {
    marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center',
    gap: spacing.xs + 2, backgroundColor: '#F6F1E6',
    borderRadius: 12, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
  },
  mySummaryBottomText: {
    flex: 1, fontSize: 14, color: '#8A6600',
    fontWeight: '800', fontFamily: 'BarlowCondensed_700Bold',
  },
  tableCompleteTitle: {
    marginTop: spacing.lg, marginBottom: spacing.sm,
    marginHorizontal: spacing.md, fontSize: 26, letterSpacing: 1.5,
    color: '#3E4F5A', fontWeight: '900', fontFamily: 'BarlowCondensed_800ExtraBold',
  },

  list: { paddingBottom: spacing.xxl * 2 },
  rowWrap: { marginHorizontal: spacing.md },

  emptyList: {
    alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl,
  },
  emptyListIcon: {
    width: 64, height: 64, borderRadius: radius.full,
    backgroundColor: colors.accentLight, alignItems: 'center',
    justifyContent: 'center', marginBottom: spacing.md,
  },
  emptyListTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.xs },
  emptyListSub: { ...typography.body, color: colors.textMuted, textAlign: 'center' },

  loadingOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  loadingOverlayText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },

  // Quiniela modal
  quinielaModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  quinielaModalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '88%', overflow: 'hidden',
  },
  quinielaModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  quinielaModalUserInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  quinielaModalUserText: { flex: 1 },
  quinielaModalUserName: {
    fontSize: 17, fontWeight: '900', color: colors.text,
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  quinielaModalUserHandle: {
    fontSize: 12, color: colors.textMuted, fontWeight: '600',
    fontFamily: 'BarlowCondensed_600SemiBold',
  },
  quinielaModalPoints: { alignItems: 'center' },
  quinielaModalPointsNum: {
    fontSize: 28, fontWeight: '900', color: colors.primaryDark,
    fontFamily: 'BarlowCondensed_900Black', lineHeight: 26,
  },
  quinielaModalPointsLabel: {
    fontSize: 10, color: colors.textMuted, fontWeight: '700',
    fontFamily: 'BarlowCondensed_700Bold',
  },
  quinielaModalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  quinielaModalScroll: { flex: 1 },
  quinielaModalScrollContent: { paddingBottom: spacing.md },
  quinielaMatchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  quinielaMatchRowFirst: {},
  quinielaMatchInfo: { flex: 1, marginRight: spacing.sm },
  quinielaMatchGroup: {
    fontSize: 10, fontWeight: '800', color: colors.primary,
    letterSpacing: 0.5, fontFamily: 'BarlowCondensed_700Bold',
  },
  quinielaMatchTeams: {
    fontSize: 14, fontWeight: '800', color: colors.text,
    fontFamily: 'BarlowCondensed_700Bold',
  },
  quinielaScoreBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primaryDark, borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    gap: 6, minWidth: 68, justifyContent: 'center',
  },
  quinielaScoreNum: {
    fontSize: 20, fontWeight: '900', color: '#fff',
    fontFamily: 'BarlowCondensed_900Black',
  },
  quinielaScoreSep: {
    fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.6)',
  },
  quinielaModalFooter: {
    padding: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  quinielaDownloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, backgroundColor: colors.primaryDark,
    borderRadius: radius.md, paddingVertical: spacing.sm + 2,
  },
  quinielaDownloadBtnDisabled: { opacity: 0.6 },
  quinielaDownloadBtnText: {
    fontSize: 14, fontWeight: '800', color: '#fff',
    fontFamily: 'BarlowCondensed_700Bold',
  },

  // Unused legacy styles kept to avoid breaks
  heroWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  heroCard: { backgroundColor: colors.navy, borderRadius: radius.xl, padding: spacing.md, overflow: 'hidden', ...shadows.lg },
  pdfHintBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginHorizontal: spacing.md, marginTop: spacing.xs, marginBottom: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2, borderRadius: radius.full, backgroundColor: '#EAF3FF', borderWidth: 1, borderColor: '#C5D8F0', alignSelf: 'flex-start' },
  pdfHintText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
});
