import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from './ui/theme';
import type { Standing } from '@/types';
import { RankChangeIndicator } from './RankChangeIndicator';
import { UserAvatar } from './UserAvatar';

interface StandingRowProps {
  standing: Standing;
  isCurrentUser?: boolean;
  isAdmin?: boolean;
  isPaid?: boolean;
  canViewPdf?: boolean;
  rankChange?: number;
  isFirst?: boolean;
  isLast?: boolean;
  onPress?: () => void;
  onTogglePaid?: (isPaid: boolean) => void;
}

export function StandingRow({
  standing,
  isCurrentUser,
  isAdmin: _isAdmin,
  isPaid: _isPaid,
  canViewPdf,
  rankChange,
  isFirst,
  isLast,
  onPress,
  onTogglePaid: _onTogglePaid,
}: StandingRowProps) {
  const rank = standing.rank ?? 99;
  const precision =
    standing.matches_played > 0 ? Math.round((standing.correct_results / standing.matches_played) * 100) : 0;
  const rankColor = rank <= 3 ? '#C59411' : '#556873';

  return (
    <TouchableOpacity
      activeOpacity={canViewPdf ? 0.75 : 1}
      onPress={canViewPdf ? onPress : undefined}
      style={[styles.row, isFirst && styles.rowFirst, isLast && styles.rowLast, isCurrentUser && styles.currentUser]}
    >
      <View style={styles.rankWrap}>
        <Text style={[styles.rankNum, { color: rankColor }]}>{rank === 99 ? '—' : rank}</Text>
      </View>

      <View style={styles.avatarWrap}>
        <UserAvatar
          avatarUrl={standing.profile?.avatar_url}
          name={standing.profile?.username}
          rank={rank <= 3 ? rank : undefined}
          size={40}
        />
      </View>

      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.username} numberOfLines={1}>{standing.profile?.username ?? 'Unknown'}</Text>
          {isCurrentUser && <Text style={styles.youTag}>TÚ</Text>}
        </View>
        <Text style={styles.subtitle}>
          🎯 {standing.exact_scores} · {precision}%
        </Text>
      </View>

      <View style={styles.rightWrap}>
        <View style={styles.pointsWrap}>
          <RankChangeIndicator delta={rankChange ?? 0} />
          <Text style={styles.points}>{standing.total_points}</Text>
        </View>
        <Text style={styles.ptLabel}>PTS</Text>
        {canViewPdf && <Ionicons name="document-text-outline" size={12} color={colors.textMuted} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: 0,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#E2E7EA',
    overflow: 'hidden',
  },
  rowFirst: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  rowLast: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    marginBottom: spacing.md,
  },
  currentUser: {
    backgroundColor: '#FCFBF7',
  },

  rankWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs + 2,
  },
  rankNum: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },

  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: '#F1F3F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarLetter: { fontSize: 18 },

  userInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  username: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  youTag: {
    fontSize: 18,
    color: '#C59411',
    fontWeight: '800',
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  subtitle: {
    fontSize: 13,
    color: '#788A95',
    marginTop: 2,
    fontFamily: 'BarlowCondensed_600SemiBold',
  },

  rightWrap: { alignItems: 'flex-end' },
  pointsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  points: {
    fontSize: 38,
    fontWeight: '900',
    color: colors.navy,
    lineHeight: 36,
    fontFamily: 'BarlowCondensed_900Black',
  },
  ptLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7A8E99',
    fontFamily: 'BarlowCondensed_700Bold',
  },
  pdfChip: {
    marginTop: 2,
    alignItems: 'flex-end',
    opacity: 0.8,
  },
  pdfChipText: { fontSize: 10, fontWeight: '700', color: colors.primary },
});
