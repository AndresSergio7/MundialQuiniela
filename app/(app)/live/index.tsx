import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { colors, spacing, radius, shadows } from '@/components/ui/theme';

type LiveEvent = {
  minute: string;
  text: string;
  kind: 'goal' | 'card' | 'sub' | 'kickoff';
};

type LiveMatch = {
  id: string;
  league: string;
  home: string;
  away: string;
  homeCode: string;
  awayCode: string;
  homeScore: number;
  awayScore: number;
  minute: string;
  status: string;
  events: LiveEvent[];
};

const MOCK_MATCHES: LiveMatch[] = [
  {
    id: '1',
    league: 'Grupo A',
    home: 'Mexico',
    away: 'Uruguay',
    homeCode: 'MX',
    awayCode: 'UY',
    homeScore: 1,
    awayScore: 1,
    minute: '72\'',
    status: 'EN JUEGO',
    events: [
      { minute: '67\'', text: 'Cambio Mexico: Sale Alvarez, entra Chavez', kind: 'sub' },
      { minute: '54\'', text: 'Gol de Uruguay (Valverde)', kind: 'goal' },
      { minute: '39\'', text: 'Amarilla para Caceres', kind: 'card' },
      { minute: '1\'', text: 'Arranca el partido en CDMX', kind: 'kickoff' },
    ],
  },
  {
    id: '2',
    league: 'Grupo B',
    home: 'Brazil',
    away: 'Spain',
    homeCode: 'BR',
    awayCode: 'ES',
    homeScore: 2,
    awayScore: 0,
    minute: '59\'',
    status: 'EN JUEGO',
    events: [
      { minute: '58\'', text: 'Gol de Brazil (Vinicius)', kind: 'goal' },
      { minute: '33\'', text: 'Gol de Brazil (Rodrygo)', kind: 'goal' },
      { minute: '15\'', text: 'Amarilla para Carvajal', kind: 'card' },
    ],
  },
  {
    id: '3',
    league: 'Grupo C',
    home: 'Argentina',
    away: 'Italy',
    homeCode: 'AR',
    awayCode: 'IT',
    homeScore: 0,
    awayScore: 0,
    minute: 'Descanso',
    status: 'HT',
    events: [
      { minute: '41\'', text: 'Atajada clave del portero italiano', kind: 'kickoff' },
      { minute: '24\'', text: 'Cambio por lesion en Argentina', kind: 'sub' },
    ],
  },
];

function eventIcon(kind: LiveEvent['kind']) {
  if (kind === 'goal') return 'football';
  if (kind === 'card') return 'square';
  if (kind === 'sub') return 'swap-horizontal';
  return 'play';
}

function eventColor(kind: LiveEvent['kind']) {
  if (kind === 'goal') return '#00A86B';
  if (kind === 'card') return '#E67E22';
  if (kind === 'sub') return '#2980B9';
  return '#64748B';
}

export default function LiveScreen() {
  const stats = useMemo(() => {
    const inPlay = MOCK_MATCHES.filter((m) => m.status === 'EN JUEGO').length;
    const goals = MOCK_MATCHES.reduce((acc, m) => acc + m.homeScore + m.awayScore, 0);
    return { inPlay, goals };
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.liveDot} />
        <Text style={styles.heroEyebrow}>SEGUIMIENTO EN TIEMPO REAL</Text>
        <Text style={styles.heroTitle}>Partidos En Vivo</Text>
        <Text style={styles.heroSub}>Mockup visual para futura integracion de data real minuto a minuto.</Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{stats.inPlay}</Text>
            <Text style={styles.metricLabel}>Jugandose</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{stats.goals}</Text>
            <Text style={styles.metricLabel}>Goles hoy</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{MOCK_MATCHES.length}</Text>
            <Text style={styles.metricLabel}>Totales</Text>
          </View>
        </View>
      </View>

      {MOCK_MATCHES.map((match) => (
        <Card key={match.id} style={styles.matchCard}>
          <View style={styles.matchTopRow}>
            <View style={styles.badgeLeague}>
              <Text style={styles.badgeLeagueText}>{match.league}</Text>
            </View>
            <View style={styles.badgeStatus}>
              <Text style={styles.badgeStatusText}>{match.status}</Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.teamBlock}>
              <Text style={styles.teamCode}>{match.homeCode}</Text>
              <Text style={styles.teamName}>{match.home}</Text>
            </View>

            <View style={styles.scoreCenter}>
              <Text style={styles.scoreText}>{match.homeScore} - {match.awayScore}</Text>
              <Text style={styles.minuteText}>{match.minute}</Text>
            </View>

            <View style={styles.teamBlockRight}>
              <Text style={styles.teamCode}>{match.awayCode}</Text>
              <Text style={styles.teamName}>{match.away}</Text>
            </View>
          </View>

          <View style={styles.timelineWrap}>
            {match.events.map((event, index) => (
              <View key={`${match.id}-${index}`} style={styles.eventRow}>
                <View style={[styles.eventIconWrap, { backgroundColor: `${eventColor(event.kind)}20` }]}>
                  <Ionicons name={eventIcon(event.kind)} size={12} color={eventColor(event.kind)} />
                </View>
                <Text style={styles.eventMinute}>{event.minute}</Text>
                <Text style={styles.eventText}>{event.text}</Text>
              </View>
            ))}
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EEF3FB' },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },

  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    backgroundColor: '#0E2F66',
    marginBottom: spacing.md,
    ...shadows.lg,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF5A5A',
    marginBottom: spacing.sm,
  },
  heroEyebrow: {
    fontSize: 11,
    color: '#9CC2FF',
    letterSpacing: 1,
    fontWeight: '800',
  },
  heroTitle: {
    marginTop: spacing.xs,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSub: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
    color: '#D7E5FF',
  },
  metricsRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  metricLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: '#DBE8FF',
  },

  matchCard: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#D4E0F2',
    padding: spacing.md,
    backgroundColor: '#fff',
  },
  matchTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badgeLeague: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: '#EAF6EE',
  },
  badgeLeagueText: {
    fontSize: 11,
    color: '#097C46',
    fontWeight: '700',
  },
  badgeStatus: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: '#FFECEC',
  },
  badgeStatusText: {
    fontSize: 11,
    color: '#CC3434',
    fontWeight: '800',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  teamBlock: {
    flex: 1,
    alignItems: 'flex-start',
  },
  teamBlockRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  teamCode: {
    fontSize: 11,
    color: '#6D84A3',
    fontWeight: '800',
  },
  teamName: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  scoreCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0E2F66',
  },
  minuteText: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#D04747',
  },
  timelineWrap: {
    borderTopWidth: 1,
    borderTopColor: '#E7EEF9',
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eventIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventMinute: {
    width: 34,
    fontSize: 11,
    color: '#6A809F',
    fontWeight: '700',
  },
  eventText: {
    flex: 1,
    fontSize: 12,
    color: '#1C345A',
    fontWeight: '500',
  },
});
