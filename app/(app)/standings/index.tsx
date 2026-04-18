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
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import { getStandingsWithAllMembers } from '@/services/standings';
import { getPoolMembers } from '@/services/pools';
import { syncResults } from '@/lib/api';
import { PoolSelectorBar } from '@/components/PoolSelectorBar';
import { StandingRow } from '@/components/StandingRow';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/components/ui/theme';
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
      <View style={styles.centered}>
        <Text style={styles.noPool}>Select a pool from Home to view standings.</Text>
      </View>
    );
  }

  const userStanding = standings.find((s) => s.user_id === user?.id);

  return (
    <View style={styles.screen}>
      <PoolSelectorBar onPoolChange={(pool) => loadStandings(pool)} />

      {/* Sync button row */}
      <View style={styles.actionRow}>
        <Text style={styles.participantsLabel}>
          {standings.length} de {memberCount} miembro{memberCount !== 1 ? 's' : ''} enviaron
        </Text>
        <TouchableOpacity onPress={handleSync} disabled={syncing}>
          <Text style={styles.syncBtn}>{syncing ? 'Sincronizando…' : 'Sincronizar resultados'}</Text>
        </TouchableOpacity>
      </View>

      {/* User's own standing card */}
      {userStanding && (
        <Card style={styles.myCard}>
          <Text style={styles.myCardLabel}>Mi posición</Text>
          <View style={styles.myCardRow}>
            <Text style={styles.myRank}>
              {userStanding.rank != null ? `#${userStanding.rank}` : '-'}
            </Text>
            <View style={styles.myStats}>
              <Text style={styles.myPoints}>{userStanding.total_points} pts</Text>
              <Text style={styles.myMeta}>
                {userStanding.exact_scores} exactos · {userStanding.correct_results} acertados
              </Text>
            </View>
          </View>
        </Card>
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
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadStandings()} />}
          renderItem={({ item }) => (
            <StandingRow
              standing={item}
              isCurrentUser={item.user_id === user?.id}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aún no hay participantes en la tabla</Text>
              <Text style={styles.emptySubText}>
                Los miembros aparecerán aquí cuando envíen su quiniela.
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noPool: { ...typography.body, color: colors.textMuted },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  participantsLabel: { ...typography.caption, color: colors.textMuted },
  syncBtn: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  myCard: {
    margin: spacing.md,
    marginBottom: 0,
    backgroundColor: colors.primary,
  },
  myCardLabel: { ...typography.caption, color: '#c9d4f5', marginBottom: spacing.xs },
  myCardRow: { flexDirection: 'row', alignItems: 'center' },
  myRank: { ...typography.h1, color: '#fff', marginRight: spacing.md },
  myStats: { flex: 1 },
  myPoints: { ...typography.h3, color: '#fff', fontWeight: '700' },
  myMeta: { ...typography.caption, color: '#c9d4f5', marginTop: 2 },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { ...typography.h3, color: colors.text },
  emptySubText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
