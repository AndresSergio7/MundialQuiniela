import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import { fetchAllMatches } from '@/services/matches.service';
import { fetchUserPredictions } from '@/services/predictions.service';
import { PoolSelectorBar } from '@/components/PoolSelectorBar';
import { colors, spacing, radius, shadows } from '@/components/ui/theme';
import { getCountryFlagFallback } from '@/lib/flags';
import type { Match } from '@/types';

type LiveFilter = 'live' | 'today';

function getMatchResult(match: Match, predHome: number | null, predAway: number | null) {
  if (match.home_score == null || match.away_score == null) return null;
  if (predHome == null || predAway == null) return 'no_pred';
  if (predHome === match.home_score && predAway === match.away_score) return 'exact';
  const actualWinner = match.home_score > match.away_score ? 'home' : match.away_score > match.home_score ? 'away' : 'draw';
  const predWinner = predHome > predAway ? 'home' : predAway > predHome ? 'away' : 'draw';
  return actualWinner === predWinner ? 'correct' : 'wrong';
}

function getPoints(result: ReturnType<typeof getMatchResult>): number {
  if (result === 'exact') return 5;
  if (result === 'correct') return 2;
  return 0;
}

export default function LiveScreen() {
  const { user } = useAuthStore();
  const { currentPool } = usePoolStore();
  const [filter, setFilter] = useState<LiveFilter>('live');
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [todayMatches, setTodayMatches] = useState<Match[]>([]);
  const [predMap, setPredMap] = useState<Record<string, { home: number; away: number }>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await fetchAllMatches();
    const todayStr = new Date().toISOString().slice(0, 10);
    setLiveMatches(all.filter(m => m.status === 'live'));
    setTodayMatches(all.filter(m => m.match_date.slice(0, 10) === todayStr));
    if (currentPool && user) {
      const preds = await fetchUserPredictions(currentPool.id, user.id);
      const map: Record<string, { home: number; away: number }> = {};
      for (const p of preds) map[p.match_id] = { home: p.home_score, away: p.away_score };
      setPredMap(map);
    }
    setLoading(false);
  }, [currentPool, user]);

  useEffect(() => { load(); }, [load]);

  const visibleMatches = filter === 'live' ? liveMatches : todayMatches;
  const todayLabel = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayStr = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

  return (
    <View style={styles.screen}>
      <PoolSelectorBar contextLabel="EN VIVO" rightBadgeText="HOY" />
      {/* Date header */}
      <View style={styles.dateHeader}>
        <Text style={styles.dateTitle}>Hoy · {todayStr}</Text>
        <Text style={styles.dateSub}>Compara tus predicciones vs los marcadores reales</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, filter === 'live' && styles.tabActive]}
          onPress={() => setFilter('live')}
        >
          {filter === 'live' && <View style={styles.liveTabDot} />}
          <Text style={[styles.tabText, filter === 'live' && styles.tabTextActive]}>
            En vivo · {liveMatches.length}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, filter === 'today' && styles.tabActive]}
          onPress={() => setFilter('today')}
        >
          <Text style={[styles.tabText, filter === 'today' && styles.tabTextActive]}>
            Todos hoy · {todayMatches.length}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visibleMatches}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item: match }) => {
          const pred = predMap[match.id];
          const result = match.status !== 'scheduled'
            ? getMatchResult(match, pred?.home ?? null, pred?.away ?? null)
            : null;
          const pts = result ? getPoints(result) : null;
          const isLive = match.status === 'live';
          const headerBg = isLive ? '#DC2626' : match.status === 'finished' ? '#B91C1C' : colors.accent;
          const statusLabel = isLive ? 'EN VIVO' : match.status === 'finished' ? 'FINAL' : 'HOY';

          return (
            <View style={styles.card}>
              <View style={[styles.cardHeader, { backgroundColor: headerBg }]}>
                <View style={styles.cardHeaderLeft}>
                  {isLive && <View style={styles.liveDot} />}
                  <Text style={styles.cardHeaderStatus}>{statusLabel}</Text>
                </View>
                {pts != null && (
                  <View style={styles.ptsChip}>
                    <Text style={styles.ptsChipText}>{pts > 0 ? `+${pts} PTS` : 'SIN PTS'}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardBody}>
                <View style={styles.teamRow}>
                  <View style={styles.teamSide}>
                    <Text style={styles.teamFlag}>{getCountryFlagFallback(match.home_team_code)}</Text>
                    <Text style={styles.teamName} numberOfLines={1}>{match.home_team}</Text>
                  </View>
                  <Text style={styles.score}>
                    {match.home_score != null ? match.home_score : '·'}
                    {' · '}
                    {match.away_score != null ? match.away_score : '·'}
                  </Text>
                  <View style={[styles.teamSide, styles.teamSideRight]}>
                    <Text style={[styles.teamName, styles.teamNameRight]} numberOfLines={1}>{match.away_team}</Text>
                    <Text style={styles.teamFlag}>{getCountryFlagFallback(match.away_team_code)}</Text>
                  </View>
                </View>

                {pred != null && (
                  <View style={[
                    styles.predRow,
                    result === 'exact' ? styles.predExact :
                    result === 'correct' ? styles.predCorrect :
                    result === 'wrong' ? styles.predWrong : styles.predNeutral,
                  ]}>
                    <Text style={styles.predLabel}>TU PREDICCIÓN  {pred.home}-{pred.away}</Text>
                    <View style={styles.predStatus}>
                      {result === 'exact' && (
                        <>
                          <Ionicons name="radio-button-on" size={13} color="#D97706" />
                          <Text style={styles.predExactText}>MARCADOR EXACTO</Text>
                        </>
                      )}
                      {result === 'correct' && (
                        <>
                          <Ionicons name="checkmark" size={13} color="#16A34A" />
                          <Text style={styles.predCorrectText}>RESULTADO CORRECTO</Text>
                        </>
                      )}
                      {result === 'wrong' && (
                        <>
                          <Ionicons name="close" size={13} color="#DC2626" />
                          <Text style={styles.predWrongText}>NO ACERTASTE</Text>
                        </>
                      )}
                      {result === 'no_pred' && (
                        <Text style={styles.predNoPredText}>Sin predicción</Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="radio-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {filter === 'live' ? 'No hay partidos en vivo ahora' : 'No hay partidos hoy'}
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
  dateHeader: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.lg,
  },
  dateTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 2 },
  dateSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  tabRow: {
    flexDirection: 'row', backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabActive: { backgroundColor: '#fff' },
  liveTabDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#CC3434' },
  tabText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  tabTextActive: { color: colors.navy },
  list: { padding: spacing.md, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden', ...shadows.md },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#fff' },
  cardHeaderStatus: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  ptsChip: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  ptsChipText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  cardBody: { padding: spacing.md },
  teamRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  teamSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  teamSideRight: { justifyContent: 'flex-end' },
  teamFlag: { fontSize: 22 },
  teamName: { fontSize: 15, fontWeight: '800', color: colors.text, flexShrink: 1 },
  teamNameRight: { textAlign: 'right' },
  score: { fontSize: 24, fontWeight: '900', color: colors.primaryDark, textAlign: 'center', minWidth: 84 },
  predRow: { borderRadius: radius.md, padding: spacing.sm, gap: 4, borderWidth: 1 },
  predNeutral: { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
  predExact: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  predCorrect: { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
  predWrong: { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
  predLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  predStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  predExactText: { fontSize: 11, fontWeight: '800', color: '#D97706' },
  predCorrectText: { fontSize: 11, fontWeight: '800', color: '#16A34A' },
  predWrongText: { fontSize: 11, fontWeight: '800', color: '#DC2626' },
  predNoPredText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
});
