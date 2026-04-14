import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from './ui/theme';
import type { Standing } from '@/types';

interface StandingRowProps {
  standing: Standing;
  isCurrentUser?: boolean;
}

export function StandingRow({ standing, isCurrentUser }: StandingRowProps) {
  const rankColor = [colors.gold, colors.silver, colors.bronze][
    (standing.rank ?? 99) - 1
  ];

  return (
    <View style={[styles.row, isCurrentUser && styles.currentUser]}>
      <View style={[styles.rankBadge, rankColor ? { backgroundColor: rankColor } : null]}>
        <Text style={styles.rankText}>{standing.rank ?? '-'}</Text>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.username} numberOfLines={1}>
          {standing.profile?.username ?? 'Unknown'}
        </Text>
        <Text style={styles.subtitle}>
          {standing.exact_scores} exact · {standing.correct_results} correct
        </Text>
      </View>

      <Text style={styles.points}>{standing.total_points}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentUser: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: '#eef2ff',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rankText: { ...typography.label, fontWeight: '700', color: colors.text },
  userInfo: { flex: 1 },
  username: { ...typography.body, fontWeight: '600', color: colors.text },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  points: { ...typography.h3, color: colors.primary, fontWeight: '700' },
});
