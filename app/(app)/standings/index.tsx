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
import { Card } from '@/components/ui/Card';
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

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statsLeft}>
          <Text style={styles.statsCount}>
            <Text style={styles.statsCountBold}>{submittedCount}</Text>
            <Text style={styles.statsSep}> / </Text>
            <Text>{memberCount}</Text>
          </Text>
          <Text style={styles.statsLabel}> participantes enviaron</Text>
        </View>
        <TouchableOpacity
          style={[styles.syncChip, syncing && styles.syncChipActive]}
          onPress={handleSync}
          disabled={syncing}
        >
          <Ionicons
            name={syncing ? 'sync' : 'refresh-outline'}
            size={13}
            color={syncing ? colors.accent : colors.primary}
          />
          <Text style={[styles.syncText, syncing && styles.syncTextActive]}>
            {syncing ? 'Sincronizando…' : 'Sincronizar'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Submission progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${submittedPct}%` as any }]} />
      </View>

      {/* My position card */}
      {userStanding && (
        <View style={styles.myCardWrap}>
          <View style={styles.myCard}>
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
            <View style={styles.myCardGlow} />
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

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statsLeft: { flexDirection: 'row', alignItems: 'baseline' },
  statsCount: { ...typography.label, color: colors.textMuted },
  statsCountBold: { ...typography.label, color: colors.text, fontWeight: '700' },
  statsSep: { color: colors.textLight },
  statsLabel: { ...typography.caption, color: colors.textMuted },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  syncChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  syncText: { ...typography.tiny, color: colors.primary, fontWeight: '600' },
  syncTextActive: { color: colors.accent },

  progressTrack: {
    height: 3,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.primary,
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
  myCardGlow: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: 'rgba(201,168,76,0.12)',
  },

  list: { padding: spacing.md, paddingBottom: spacing.xxl },

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
