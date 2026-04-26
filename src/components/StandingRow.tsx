import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from './ui/theme';
import type { Standing } from '@/types';

interface StandingRowProps {
  standing: Standing;
  isCurrentUser?: boolean;
}

const MEDAL: Record<number, { bg: string; textColor: string; icon?: string }> = {
  1: { bg: colors.gold,   textColor: colors.navy, icon: '🥇' },
  2: { bg: colors.silver, textColor: '#fff',       icon: '🥈' },
  3: { bg: colors.bronze, textColor: '#fff',       icon: '🥉' },
};

export function StandingRow({ standing, isCurrentUser }: StandingRowProps) {
  const rank = standing.rank ?? 99;
  const medal = MEDAL[rank];
  const isTop3 = rank <= 3;

  return (
    <View style={[
      styles.row,
      isTop3 && styles.topRow,
      isCurrentUser && styles.currentUser,
      isTop3 && isCurrentUser && styles.topCurrentUser,
    ]}>
      <View style={[styles.leftAccent, isTop3 && styles.leftAccentTop, isCurrentUser && styles.leftAccentCurrent]} />

      {/* Rank */}
      <View style={[styles.rankWrap, medal && { backgroundColor: medal.bg }]}>
        {isTop3 ? (
          <Text style={styles.medalText}>{medal.icon}</Text>
        ) : (
          <Text style={[styles.rankNum, { color: medal ? medal.textColor : colors.textMuted }]}>
            {rank === 99 ? '—' : rank}
          </Text>
        )}
      </View>

      {/* Avatar + user */}
      <View style={styles.avatarWrap}>
        <Text style={styles.avatarLetter}>
          {(standing.profile?.username?.[0] ?? '?').toUpperCase()}
        </Text>
      </View>

      <View style={styles.userInfo}>
        <Text style={[styles.username, isCurrentUser && styles.usernameHighlight]} numberOfLines={1}>
          {standing.profile?.username ?? 'Unknown'}
          {isCurrentUser ? ' (tú)' : ''}
        </Text>
        <Text style={styles.subtitle}>
          {standing.exact_scores} exactos · {standing.correct_results} acertados · {standing.matches_played} partidos
        </Text>
      </View>

      {/* Points */}
      <View style={styles.pointsWrap}>
        <Text style={[styles.points, isTop3 && styles.pointsTop]}>{standing.total_points}</Text>
        <Text style={styles.ptLabel}>pts</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 3,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#D7E3F0',
    ...shadows.sm,
    overflow: 'hidden',
  },
  leftAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#C8D6E7',
  },
  leftAccentTop: {
    backgroundColor: colors.accent,
  },
  leftAccentCurrent: {
    backgroundColor: colors.primary,
  },
  topRow: {
    borderColor: colors.accent + '80',
    backgroundColor: '#FFFCF2',
  },
  currentUser: {
    borderColor: colors.primary + '88',
    borderWidth: 1.5,
    backgroundColor: '#F1FAF5',
  },
  topCurrentUser: {
    borderColor: colors.accent + 'AA',
    borderWidth: 2,
    backgroundColor: colors.accentLight,
  },

  rankWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: '#EAF0F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  medalText: { fontSize: 18 },
  rankNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#516987',
  },

  avatarWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarLetter: { fontSize: 14, fontWeight: '800', color: '#fff' },

  userInfo: { flex: 1, minWidth: 0 },
  username: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  usernameHighlight: { color: colors.primary },
  subtitle: {
    fontSize: 11,
    color: '#7E93AB',
    marginTop: 2,
  },

  pointsWrap: {
    alignItems: 'flex-end',
    backgroundColor: '#F5F9FF',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: '#D8E5F4',
  },
  points: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy,
  },
  pointsTop: { color: colors.accent },
  ptLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textLight,
    marginTop: -2,
  },
});
