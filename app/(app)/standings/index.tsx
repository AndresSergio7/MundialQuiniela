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
import { getStandings } from '@/services/standings';
import { syncResults } from '@/lib/api';
import { StandingRow } from '@/components/StandingRow';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/components/ui/theme';
import type { Standing } from '@/types';

export default function StandingsScreen() {
  const { user } = useAuthStore();
  const { currentPool } = usePoolStore();
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function loadStandings() {
    if (!currentPool) return;
    setLoading(true);
    const data = await getStandings(currentPool.id);
    setStandings(data);
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
  }, [currentPool]);

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
      {/* Pool header */}
      <View style={styles.poolBar}>
        <Text style={styles.poolName} numberOfLines={1}>{currentPool.name}</Text>
        <TouchableOpacity onPress={handleSync} disabled={syncing}>
          <Text style={styles.syncBtn}>{syncing ? 'Syncing...' : 'Sync Results'}</Text>
        </TouchableOpacity>
      </View>

      {/* User's own standing card */}
      {userStanding && (
        <Card style={styles.myCard}>
          <Text style={styles.myCardLabel}>My Position</Text>
          <View style={styles.myCardRow}>
            <Text style={styles.myRank}>#{userStanding.rank ?? '-'}</Text>
            <View style={styles.myStats}>
              <Text style={styles.myPoints}>{userStanding.total_points} pts</Text>
              <Text style={styles.myMeta}>
                {userStanding.exact_scores} exact · {userStanding.correct_results} correct
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
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStandings} />}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>
              {standings.length} Participants
            </Text>
          }
          renderItem={({ item }) => (
            <StandingRow
              standing={item}
              isCurrentUser={item.user_id === user?.id}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No standings yet.</Text>
              <Text style={styles.emptySubText}>
                Standings appear once matches are played.
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
  poolBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  poolName: { ...typography.label, color: '#fff', fontWeight: '700', flex: 1 },
  syncBtn: { ...typography.caption, color: colors.accent, fontWeight: '600' },
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
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { ...typography.h3, color: colors.text },
  emptySubText: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' },
});
