import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, radius, typography } from './ui/theme';
import type { Match } from '@/types';

interface MatchRowProps {
  match: Match;
  homeScore: string;
  awayScore: string;
  locked: boolean;
  onHomeChange: (val: string) => void;
  onAwayChange: (val: string) => void;
  pointsEarned?: number;
}

export function MatchRow({
  match,
  homeScore,
  awayScore,
  locked,
  onHomeChange,
  onAwayChange,
  pointsEarned,
}: MatchRowProps) {
  const matchDate = new Date(match.match_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <View style={styles.meta}>
        <Text style={styles.group}>Group {match.group_name}</Text>
        <Text style={styles.date}>{matchDate}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.teamHome} numberOfLines={1}>
          {match.home_team_code}
        </Text>

        <View style={styles.scoreContainer}>
          <TextInput
            style={[styles.scoreInput, locked && styles.locked]}
            value={homeScore}
            onChangeText={onHomeChange}
            keyboardType="number-pad"
            maxLength={2}
            editable={!locked}
            selectTextOnFocus
            placeholder="-"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.separator}>:</Text>
          <TextInput
            style={[styles.scoreInput, locked && styles.locked]}
            value={awayScore}
            onChangeText={onAwayChange}
            keyboardType="number-pad"
            maxLength={2}
            editable={!locked}
            selectTextOnFocus
            placeholder="-"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <Text style={styles.teamAway} numberOfLines={1}>
          {match.away_team_code}
        </Text>

        {pointsEarned !== undefined && (
          <View style={[styles.pointsBadge, getPointsStyle(pointsEarned)]}>
            <Text style={styles.pointsText}>{pointsEarned}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function getPointsStyle(pts: number) {
  if (pts === 6) return { backgroundColor: colors.success };
  if (pts >= 3) return { backgroundColor: colors.accent };
  if (pts === 1) return { backgroundColor: colors.warning };
  return { backgroundColor: colors.border };
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  group: { ...typography.caption, color: colors.textMuted },
  date: { ...typography.caption, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamHome: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'left',
  },
  teamAway: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  scoreInput: {
    width: 40,
    height: 40,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    textAlign: 'center',
    ...typography.h3,
    color: colors.text,
    backgroundColor: colors.background,
  },
  locked: {
    backgroundColor: colors.border,
    color: colors.textMuted,
  },
  separator: {
    ...typography.h3,
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },
  pointsBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  pointsText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
  },
});
