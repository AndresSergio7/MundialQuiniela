import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
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

const FLAG_MAP: Record<string, string> = {
  MEX: '🇲🇽',
  CRC: '🇨🇷',
  ZAF: '🇿🇦',
  CAN: '🇨🇦',
  BIH: '🇧🇦',
  QAT: '🇶🇦',
  SUI: '🇨🇭',
  BRA: '🇧🇷',
  MAR: '🇲🇦',
  HTI: '🇭🇹',
  SCO: '🏴',
  USA: '🇺🇸',
  URU: '🇺🇾',
  ESP: '🇪🇸',
  POR: '🇵🇹',
  ARG: '🇦🇷',
  POL: '🇵🇱',
  FRA: '🇫🇷',
  BEL: '🇧🇪',
  AUS: '🇦🇺',
  KOR: '🇰🇷',
  GER: '🇩🇪',
  JPN: '🇯🇵',
  NED: '🇳🇱',
  SEN: '🇸🇳',
  ENG: '🏴',
  IRN: '🇮🇷',
  ECU: '🇪🇨',
  COL: '🇨🇴',
  ITA: '🇮🇹',
  PER: '🇵🇪',
  CRO: '🇭🇷',
  CIV: '🇨🇮',
  DEN: '🇩🇰',
  SRB: '🇷🇸',
  CMR: '🇨🇲',
  CHI: '🇨🇱',
  GHA: '🇬🇭',
  ALG: '🇩🇿',
  TUR: '🇹🇷',
  EGY: '🇪🇬',
  VEN: '🇻🇪',
  PAR: '🇵🇾',
  RSA: '🇿🇦',
  NZL: '🇳🇿',
  UKR: '🇺🇦',
  COD: '🇨🇩',
};

function getFlag(code: string) {
  return FLAG_MAP[code] ?? '🏳️';
}

function formatMatchDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
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
  return (
    <View style={styles.container}>
      <View style={styles.mainRow}>
        <View style={styles.teamBlockLeft}>
          <Text style={styles.teamName} numberOfLines={1}>
            {match.home_team}
          </Text>
          <Text style={styles.flag}>{getFlag(match.home_team_code)}</Text>
        </View>

        <View style={styles.centerBlock}>
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
          <Text style={styles.separator}>-</Text>
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

        <View style={styles.teamBlockRight}>
          <Text style={styles.flag}>{getFlag(match.away_team_code)}</Text>
          <Text style={styles.teamNameRight} numberOfLines={1}>
            {match.away_team}
          </Text>
        </View>
      </View>

      <Text style={styles.dateText}>{formatMatchDate(match.match_date)}</Text>

      {pointsEarned !== undefined && (
        <View style={[styles.pointsBadge, getPointsStyle(pointsEarned)]}>
          <Text style={styles.pointsText}>{pointsEarned} pts</Text>
        </View>
      )}
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
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    minWidth: 0,
    paddingRight: 8,
  },
  teamBlockRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: 0,
    paddingLeft: 8,
  },
  teamName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginRight: 6,
    flexShrink: 1,
    textAlign: 'right',
  },
  teamNameRight: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginLeft: 6,
    flexShrink: 1,
    textAlign: 'left',
  },
  flag: {
    fontSize: 16,
  },
  centerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreInput: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    textAlign: 'center',
    color: colors.text,
    backgroundColor: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
  locked: {
    backgroundColor: '#E5E7EB',
    color: colors.textMuted,
  },
  separator: {
    marginHorizontal: 6,
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 11,
    color: colors.textMuted,
  },
  pointsBadge: {
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
});
