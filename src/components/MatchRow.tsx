import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography, shadows } from './ui/theme';
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

const FLAG_MAP: Record<string, string> = {
  MEX:'🇲🇽',CRC:'🇨🇷',ZAF:'🇿🇦',CAN:'🇨🇦',BIH:'🇧🇦',QAT:'🇶🇦',
  SUI:'🇨🇭',BRA:'🇧🇷',MAR:'🇲🇦',HTI:'🇭🇹',SCO:'🏴',USA:'🇺🇸',
  URU:'🇺🇾',ESP:'🇪🇸',POR:'🇵🇹',ARG:'🇦🇷',POL:'🇵🇱',FRA:'🇫🇷',
  BEL:'🇧🇪',AUS:'🇦🇺',KOR:'🇰🇷',GER:'🇩🇪',JPN:'🇯🇵',NED:'🇳🇱',
  SEN:'🇸🇳',ENG:'🏴',IRN:'🇮🇷',ECU:'🇪🇨',COL:'🇨🇴',ITA:'🇮🇹',
  PER:'🇵🇪',CRO:'🇭🇷',CIV:'🇨🇮',DEN:'🇩🇰',SRB:'🇷🇸',CMR:'🇨🇲',
  CHI:'🇨🇱',GHA:'🇬🇭',ALG:'🇩🇿',TUR:'🇹🇷',EGY:'🇪🇬',VEN:'🇻🇪',
  PAR:'🇵🇾',RSA:'🇿🇦',NZL:'🇳🇿',UKR:'🇺🇦',COD:'🇨🇩',
};

function getFlag(code: string) {
  return FLAG_MAP[code] ?? '🏳️';
}

function formatMatchDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString('es-MX', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const POINTS_CONFIG: Record<number, { bg: string; label: string }> = {
  6: { bg: colors.primary,  label: '6 pts ★' },
  4: { bg: colors.accent,   label: '4 pts' },
  3: { bg: colors.navyMid,  label: '3 pts' },
  1: { bg: colors.warning,  label: '1 pt' },
  0: { bg: colors.textLight, label: '0 pts' },
};

export function MatchRow({
  match,
  homeScore,
  awayScore,
  locked,
  onHomeChange,
  onAwayChange,
  pointsEarned,
}: MatchRowProps) {
  const hasPrediction = homeScore !== '' && awayScore !== '';
  const pts = pointsEarned !== undefined ? POINTS_CONFIG[pointsEarned] ?? POINTS_CONFIG[0] : null;

  return (
    <View style={[styles.container, hasPrediction && !locked && styles.containerFilled]}>
      <View style={styles.mainRow}>
        {/* Home team */}
        <View style={styles.teamBlockLeft}>
          <Text style={styles.teamName} numberOfLines={1}>
            {match.home_team}
          </Text>
          <Text style={styles.flag}>{getFlag(match.home_team_code)}</Text>
        </View>

        {/* Score inputs */}
        <View style={styles.centerBlock}>
          <TextInput
            style={[styles.scoreInput, locked && styles.scoreInputLocked, hasPrediction && !locked && styles.scoreInputFilled]}
            value={homeScore}
            onChangeText={onHomeChange}
            keyboardType="number-pad"
            maxLength={2}
            editable={!locked}
            selectTextOnFocus
            placeholder="–"
            placeholderTextColor={colors.textLight}
          />
          <View style={styles.vsDivider}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <TextInput
            style={[styles.scoreInput, locked && styles.scoreInputLocked, hasPrediction && !locked && styles.scoreInputFilled]}
            value={awayScore}
            onChangeText={onAwayChange}
            keyboardType="number-pad"
            maxLength={2}
            editable={!locked}
            selectTextOnFocus
            placeholder="–"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Away team */}
        <View style={styles.teamBlockRight}>
          <Text style={styles.flag}>{getFlag(match.away_team_code)}</Text>
          <Text style={styles.teamNameRight} numberOfLines={1}>
            {match.away_team}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.dateText}>{formatMatchDate(match.match_date)}</Text>
        {pts && (
          <View style={[styles.pointsBadge, { backgroundColor: pts.bg }]}>
            <Text style={styles.pointsText}>{pts.label}</Text>
          </View>
        )}
        {locked && !pts && (
          <View style={styles.lockedBadge}>
            <Text style={styles.lockedText}>🔒</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  containerFilled: {
    borderColor: colors.primary + '55',
    backgroundColor: '#FAFFFE',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamBlockLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: spacing.sm,
    gap: spacing.xs,
  },
  teamBlockRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: spacing.sm,
    gap: spacing.xs,
  },
  teamName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
    flexShrink: 1,
  },
  teamNameRight: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'left',
    flexShrink: 1,
  },
  flag: { fontSize: 20 },
  centerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  scoreInput: {
    width: 36,
    height: 36,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    textAlign: 'center',
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: 16,
    fontWeight: '800',
    paddingVertical: 0,
  },
  scoreInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.successLight,
    color: colors.primaryDark,
  },
  scoreInputLocked: {
    backgroundColor: colors.borderLight,
    borderColor: colors.border,
    color: colors.textMuted,
  },
  vsDivider: {
    width: 28,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.xs,
  },
  vsText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  dateText: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '500',
  },
  pointsBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  pointsText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  lockedBadge: {},
  lockedText: { fontSize: 12 },
});
