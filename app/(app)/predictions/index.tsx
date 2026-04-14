import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import {
  fetchAllMatches,
  fetchUserPredictions,
  savePrediction,
  submitQuiniela,
  toPredictionMap,
} from '@/services/predictions';
import { getQuinielaStats } from '@/lib/validation';
import { MatchRow } from '@/components/MatchRow';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius } from '@/components/ui/theme';
import type { Match, Prediction, PredictionMap } from '@/types';

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export default function PredictionsScreen() {
  const { user } = useAuthStore();
  const { currentPool } = usePoolStore();

  const [matches, setMatches] = useState<Match[]>([]);
  const [predMap, setPredMap] = useState<PredictionMap>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('A');
  const [isLocked, setIsLocked] = useState(false);

  const loadData = useCallback(async () => {
    if (!user || !currentPool) return;
    setLoading(true);

    const [allMatches, userPredictions] = await Promise.all([
      fetchAllMatches(),
      fetchUserPredictions(currentPool.id, user.id),
    ]);

    setMatches(allMatches);
    setPredMap(toPredictionMap(userPredictions));

    const deadline = new Date(currentPool.prediction_deadline);
    setIsLocked(deadline <= new Date());

    setLoading(false);
  }, [user, currentPool]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleScoreChange(
    matchId: string,
    side: 'home' | 'away',
    val: string
  ) {
    if (isLocked || !user || !currentPool) return;
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0 || num > 20) return;

    const current = predMap[matchId] ?? { home: 0, away: 0 };
    const updated = {
      ...current,
      [side]: num,
    };

    setPredMap((prev) => ({ ...prev, [matchId]: updated }));

    // Auto-save on change (debounced in production)
    await savePrediction(
      currentPool.id,
      user.id,
      matchId,
      updated.home,
      updated.away
    );
  }

  async function handleSubmit() {
    if (!user || !currentPool) return;
    setSubmitting(true);

    const { success, errors } = await submitQuiniela(currentPool.id, user.id);

    setSubmitting(false);

    if (success) {
      Alert.alert('Quiniela Submitted!', 'Your predictions have been saved and validated.');
    } else {
      Alert.alert('Validation Failed', errors.join('\n\n'));
    }
  }

  const groupMatches = matches.filter((m) => m.group_name === selectedGroup);
  const stats = getQuinielaStats(predMap);
  const deadline = currentPool ? new Date(currentPool.prediction_deadline) : null;
  const deadlinePassed = deadline ? deadline <= new Date() : false;

  if (!currentPool) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noPool}>Select a pool from Home to view predictions.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Pool Info */}
      <View style={styles.poolBar}>
        <Text style={styles.poolName} numberOfLines={1}>{currentPool.name}</Text>
        {isLocked && (
          <View style={styles.lockedBadge}>
            <Text style={styles.lockedText}>LOCKED</Text>
          </View>
        )}
      </View>

      {/* Stats Bar */}
      <Card style={styles.statsBar}>
        <StatItem label="Predicted" value={`${stats.predicted}/72`} ok={stats.predicted === 72} />
        <StatItem label="Distinct" value={`${stats.distinct}/7`} ok={stats.distinct >= 7} />
        <StatItem label="Repeated" value={`${stats.repeated}/5`} ok={stats.repeated >= 5} />
        <StatItem label="Draws" value={`${stats.draws}/5`} ok={stats.draws >= 5} />
      </Card>

      {/* Deadline */}
      {deadline && (
        <Text style={[styles.deadline, deadlinePassed && styles.deadlinePassed]}>
          {deadlinePassed
            ? 'Predictions locked'
            : `Deadline: ${deadline.toLocaleDateString()}`}
        </Text>
      )}

      {/* Group Selector */}
      <FlatList
        horizontal
        data={GROUPS}
        keyExtractor={(g) => g}
        showsHorizontalScrollIndicator={false}
        style={styles.groupList}
        contentContainerStyle={styles.groupListContent}
        renderItem={({ item: group }) => (
          <TouchableOpacity
            style={[styles.groupTab, selectedGroup === group && styles.groupTabActive]}
            onPress={() => setSelectedGroup(group)}
          >
            <Text style={[styles.groupTabText, selectedGroup === group && styles.groupTabTextActive]}>
              {group}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Matches */}
      <FlatList
        data={groupMatches}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.matchList}
        renderItem={({ item: match }) => {
          const pred = predMap[match.id];
          return (
            <MatchRow
              match={match}
              homeScore={pred ? String(pred.home) : ''}
              awayScore={pred ? String(pred.away) : ''}
              locked={isLocked || match.status !== 'scheduled'}
              onHomeChange={(val) => handleScoreChange(match.id, 'home', val)}
              onAwayChange={(val) => handleScoreChange(match.id, 'away', val)}
              pointsEarned={
                match.status === 'finished'
                  ? undefined // pulled from predictions table in real use
                  : undefined
              }
            />
          );
        }}
        ListFooterComponent={
          !isLocked ? (
            <Button
              title="Submit Quiniela"
              onPress={handleSubmit}
              loading={submitting}
              style={{ marginTop: spacing.md }}
            />
          ) : null
        }
      />
    </View>
  );
}

function StatItem({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <View style={statStyles.item}>
      <Text style={[statStyles.value, ok ? statStyles.ok : statStyles.warn]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  item: { alignItems: 'center' },
  value: { ...typography.label, fontWeight: '700' },
  label: { ...typography.caption, color: colors.textMuted },
  ok: { color: colors.success },
  warn: { color: colors.error },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noPool: { ...typography.body, color: colors.textMuted },
  poolBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  poolName: { ...typography.label, color: '#fff', flex: 1, fontWeight: '700' },
  lockedBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  lockedText: { ...typography.caption, color: '#fff', fontWeight: '700' },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    margin: spacing.md,
    marginBottom: 0,
    paddingVertical: spacing.sm,
  },
  deadline: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: spacing.xs,
  },
  deadlinePassed: { color: colors.error },
  groupList: { maxHeight: 48 },
  groupListContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  groupTab: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTabActive: { backgroundColor: colors.primary },
  groupTabText: { ...typography.label, color: colors.textMuted, fontWeight: '700' },
  groupTabTextActive: { color: '#fff' },
  matchList: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
});
