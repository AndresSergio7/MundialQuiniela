import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import { getStandingsWithAllMembers } from '@/services/standings.service';
import { getPoolMembers } from '@/services/pools.service';
import { syncResults } from '@/services/results.service';
import { PoolSelectorBar } from '@/components/PoolSelectorBar';
import { StandingRow } from '@/components/StandingRow';
import { colors, spacing, typography, radius, shadows } from '@/components/ui/theme';
import type { Standing, Pool } from '@/types';

export default function StandingsScreen() {
  const { user } = useAuthStore();
  const { currentPool } = usePoolStore();
  const [standings, setStandings] = useState<Standing[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function loadStandings(pool?: Pool) {
    const activePool = pool ?? currentPool;
    if (!activePool) return;
    setLoading(true);
    const [data, members] = await Promise.all([
      getStandingsWithAllMembers(activePool.id),
      getPoolMembers(activePool.id),
    ]);
    setStandings(data);
    setMemberCount(members.length);
    setLoading(false);
  }

  async function handleSync() {
    if (!currentPool) return;
    setSyncing(true);
    await syncResults(currentPool.id);
    await loadStandings();
    setSyncing(false);
  }

  useEffect(() => {
    loadStandings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPool?.id]);

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
  const submittedCount = standings.length;
  const submittedPct = memberCount > 0 ? (submittedCount / memberCount) * 100 : 0;

  return (
    <View style={styles.screen}>
      <PoolSelectorBar onPoolChange={(pool) => loadStandings(pool)} />

      <View style={styles.heroWrap}>
        <View style={styles.heroCard}>
          <View style={styles.heroGlowA} />
          <View style={styles.heroGlowB} />
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroEyebrow}>CLASIFICACION GENERAL</Text>
              <Text style={styles.heroTitle}>Tabla de Posiciones</Text>
              <Text style={styles.heroSub}>{currentPool.name}</Text>
            </View>
            <TouchableOpacity
              style={[styles.syncChip, syncing && styles.syncChipActive]}
              onPress={handleSync}
              disabled={syncing}
            >
              <Ionicons
                name={syncing ? 'sync' : 'refresh-outline'}
                size={14}
                color={syncing ? colors.accentBright : colors.accentBright}
              />
              <Text style={[styles.syncText, syncing && styles.syncTextActive]}>
                {syncing ? 'Sync…' : 'Sync'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricChip}>
              <Ionicons name="people-outline" size={14} color={colors.accentBright} />
              <Text style={styles.metricText}>{submittedCount}/{memberCount} enviados</Text>
            </View>
            <View style={styles.metricChip}>
              <Ionicons name="bar-chart-outline" size={14} color={colors.accentBright} />
              <Text style={styles.metricText}>{Math.round(submittedPct)}% de avance</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${submittedPct}%` as any }]} />
          </View>
        </View>
      </View>

      {/* My position card */}
      {userStanding && (
        <View style={styles.myCardWrap}>
          <View style={styles.myCard}>
            <View style={styles.myAura} />
            <View style={styles.myCardLeft}>
              <Text style={styles.myCardTag}>MI POSICIÓN</Text>
              <Text style={styles.myRank}>
                {userStanding.rank != null ? `#${userStanding.rank}` : '—'}
              </Text>
            </View>
            <View style={styles.myDivider} />
            <View style={styles.myCardRight}>
              <Text style={styles.myPoints}>{userStanding.total_points}</Text>
              <Text style={styles.myPtsLabel}>puntos</Text>
              <Text style={styles.myMeta}>
                {userStanding.exact_scores} exactos · {userStanding.correct_results} acertados
              </Text>
            </View>
            <View style={styles.myCardBadge}>
              <Ionicons name="flash" size={12} color={colors.navy} />
              <Text style={styles.myCardBadgeText}>Rendimiento</Text>
            </View>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: spacing.xl }}
        />
      ) : (
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
          renderItem={({ item }) => (
            <StandingRow
              standing={item}
              isCurrentUser={item.user_id === user?.id}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <View style={styles.emptyListIcon}>
                <Ionicons name="trophy-outline" size={32} color={colors.accent} />
              </View>
              <Text style={styles.emptyListTitle}>Tabla vacía</Text>
              <Text style={styles.emptyListSub}>
                Los participantes aparecerán aquí cuando envíen su quiniela.
              </Text>
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

  list: { padding: spacing.md, paddingBottom: spacing.xxl * 2 },

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
});
