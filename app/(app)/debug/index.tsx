import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import {
  TEST_MODE,
  createTestPool,
  seedFakeUsers,
  seedFakePredictionsAndSubmit,
  setMatchResult,
  calculatePoints,
  cleanTestPool,
} from '@/lib/testMode';
import { fetchAllMatches } from '@/services/matches.service';
import { getStandingsWithAllMembers } from '@/services/standings.service';
import { colors, spacing, typography, radius } from '@/components/ui/theme';
import type { Match, Standing } from '@/types';

// ─── types ───────────────────────────────────
type LogEntry = { ok: boolean; msg: string };

// ─── screen ──────────────────────────────────
export default function DebugScreen() {
  if (!TEST_MODE) {
    return (
      <View style={styles.centered}>
        <Text style={styles.offText}>
          DEBUG MODE DESACTIVADO{'\n\n'}
          Agrega EXPO_PUBLIC_TEST_MODE=true en tu .env y reinicia el servidor.
        </Text>
      </View>
    );
  }

  return <DebugContent />;
}

function DebugContent() {
  const { user } = useAuthStore();
  const { currentPool, setCurrentPool } = usePoolStore();

  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);

  // Pool creation
  const [poolName, setPoolName] = useState('QA Pool');
  const [maxMembers, setMaxMembers] = useState('3');

  // Seed users
  const [userCount, setUserCount] = useState('2');

  // Match result
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [homeScore, setHomeScore] = useState('2');
  const [awayScore, setAwayScore] = useState('1');

  // Standings
  const [standings, setStandings] = useState<Standing[]>([]);

  // Finished matches (for results panel)
  const [finishedMatches, setFinishedMatches] = useState<Match[]>([]);

  useEffect(() => {
    fetchAllMatches().then((all) => {
      setMatches(all.slice(0, 8));
      setFinishedMatches(all.filter((m) => m.status === 'finished'));
    });
  }, []);

  function refreshFinishedMatches() {
    fetchAllMatches().then((all) =>
      setFinishedMatches(all.filter((m) => m.status === 'finished')),
    );
  }

  function addLog(ok: boolean, msg: string) {
    setLog((prev) => [{ ok, msg }, ...prev].slice(0, 20));
  }

  async function run<T>(
    label: string,
    fn: () => Promise<{ error: string | null } & T>,
  ) {
    setBusy(true);
    try {
      const result = await fn();
      if (result.error) {
        addLog(false, `${label}: ${result.error}`);
      } else {
        const extra = Object.entries(result)
          .filter(([k, v]) => k !== 'error' && v !== null)
          .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
          .join(' ');
        addLog(true, `${label} OK${extra ? ' — ' + extra : ''}`);
      }
    } catch (e: unknown) {
      addLog(false, `${label}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreatePool() {
    if (!user) return;
    await run('createTestPool', async () => {
      const r = await createTestPool(user.id, poolName.trim() || 'QA Pool', parseInt(maxMembers) || 3);
      if (r.pool) setCurrentPool(r.pool);
      return { error: r.error, pool: r.pool?.name };
    });
  }

  async function handleSeedUsers() {
    if (!currentPool) { addLog(false, 'Selecciona un pool primero'); return; }
    await run('seedFakeUsers', () => seedFakeUsers(currentPool.id, parseInt(userCount) || 2));
  }

  async function handleSeedPredictions() {
    if (!currentPool) { addLog(false, 'Selecciona un pool primero'); return; }
    await run('seedFakePredictionsAndSubmit', () =>
      seedFakePredictionsAndSubmit(currentPool.id, parseInt(userCount) || 2),
    );
  }

  async function handleSetResult() {
    if (!selectedMatch) { addLog(false, 'Selecciona un partido'); return; }
    await run('setMatchResult', async () => {
      const r = await setMatchResult(selectedMatch.id, parseInt(homeScore) || 0, parseInt(awayScore) || 0);
      if (!r.error) refreshFinishedMatches();
      return { error: r.error, match: r.match ? `${r.match.home_team} ${homeScore}-${awayScore} ${r.match.away_team}` : null };
    });
  }

  async function handleCalculate() {
    if (!currentPool) { addLog(false, 'Selecciona un pool primero'); return; }
    await run('calculatePoints', () => calculatePoints(currentPool.id));
    // Refresh standings
    const s = await getStandingsWithAllMembers(currentPool.id);
    setStandings(s);
  }

  async function handleClean() {
    if (!currentPool) { addLog(false, 'Selecciona un pool primero'); return; }
    await run('cleanTestPool', () => cleanTestPool(currentPool.id));
    setStandings([]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>🛠 DEBUG / QA</Text>

      {/* ── Pool activo ── */}
      <Section title="Pool activo">
        <Text style={styles.meta}>
          {currentPool
            ? `"${currentPool.name}" (${currentPool.max_members} slots)\nID: ${currentPool.id}`
            : 'Ninguno seleccionado'}
        </Text>
        <Row>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            value={poolName}
            onChangeText={setPoolName}
            placeholder="Nombre del pool"
          />
          <TextInput
            style={[styles.input, { width: 60 }]}
            value={maxMembers}
            onChangeText={setMaxMembers}
            keyboardType="number-pad"
            placeholder="Max"
          />
          <Btn label="Crear" onPress={handleCreatePool} busy={busy} />
        </Row>
      </Section>

      {/* ── Usuarios fake ── */}
      <Section title="Simular usuarios">
        <Row>
          <TextInput
            style={[styles.input, { width: 60 }]}
            value={userCount}
            onChangeText={setUserCount}
            keyboardType="number-pad"
            placeholder="N"
          />
          <Btn label="Seed Users" onPress={handleSeedUsers} busy={busy} />
          <Btn label="Seed + Submit Preds" onPress={handleSeedPredictions} busy={busy} color={colors.primary} />
        </Row>
        <Text style={styles.hint}>
          "Seed Users" agrega usuarios fake al pool.{'\n'}
          "Seed + Submit Preds" les asigna predicciones y las envía automáticamente.
        </Text>
      </Section>

      {/* ── Resultado de partido ── */}
      <Section title="Resultado de partido">
        <Text style={styles.meta}>Selecciona un partido:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
          {matches.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.matchChip, selectedMatch?.id === m.id && styles.matchChipSelected]}
              onPress={() => setSelectedMatch(m)}
            >
              <Text style={[styles.matchChipText, selectedMatch?.id === m.id && { color: '#fff' }]}>
                {m.home_team_code} vs {m.away_team_code}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {selectedMatch && (
          <Text style={styles.meta}>{selectedMatch.home_team} vs {selectedMatch.away_team}</Text>
        )}
        <Row>
          <TextInput
            style={[styles.input, { width: 60 }]}
            value={homeScore}
            onChangeText={setHomeScore}
            keyboardType="number-pad"
            placeholder="Local"
          />
          <Text style={styles.vs}>—</Text>
          <TextInput
            style={[styles.input, { width: 60 }]}
            value={awayScore}
            onChangeText={setAwayScore}
            keyboardType="number-pad"
            placeholder="Visit."
          />
          <Btn label="Set Result" onPress={handleSetResult} busy={busy} color="#7c3aed" />
        </Row>
      </Section>

      {/* ── Resultados aplicados ── */}
      {finishedMatches.length > 0 && (
        <Section title={`Resultados aplicados (${finishedMatches.length})`}>
          {finishedMatches.map((m) => (
            <View key={m.id} style={styles.resultRow}>
              <Text style={styles.resultTeams} numberOfLines={1}>
                {m.home_team_code} vs {m.away_team_code}
              </Text>
              <Text style={styles.resultScore}>
                {m.home_score} — {m.away_score}
              </Text>
            </View>
          ))}
        </Section>
      )}

      {/* ── Calcular puntos ── */}
      <Section title="Calcular puntos">
        <Btn label="Recalcular Standings" onPress={handleCalculate} busy={busy} color={colors.primary} fullWidth />
      </Section>

      {/* ── Standings ── */}
      {standings.length > 0 && (
        <Section title="Standings actuales">
          {standings.map((s, i) => (
            <View key={s.id} style={styles.standingRow}>
              <Text style={styles.standingRank}>#{i + 1}</Text>
              <Text style={styles.standingName}>
                {s.profile?.username ?? s.user_id.slice(0, 12)}
              </Text>
              <Text style={styles.standingPts}>{s.total_points} pts</Text>
              <Text style={styles.standingMeta}>{s.exact_scores} exactos</Text>
            </View>
          ))}
        </Section>
      )}

      {/* ── Limpiar ── */}
      <Section title="Limpiar">
        <Btn label="Clean Test Data" onPress={handleClean} busy={busy} color={colors.error} fullWidth />
        <Text style={styles.hint}>Elimina todos los usuarios fake y sus datos del pool actual.</Text>
      </Section>

      {/* ── Log ── */}
      {log.length > 0 && (
        <Section title="Log">
          {log.map((entry, i) => (
            <Text key={i} style={[styles.logEntry, { color: entry.ok ? colors.success : colors.error }]}>
              {entry.ok ? '✓' : '✗'} {entry.msg}
            </Text>
          ))}
        </Section>
      )}

      {busy && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />}
    </ScrollView>
  );
}

// ─── small components ─────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function Btn({
  label, onPress, busy, color, fullWidth,
}: {
  label: string;
  onPress: () => void;
  busy: boolean;
  color?: string;
  fullWidth?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: color ?? colors.surface, borderColor: color ?? colors.border }, fullWidth && { flex: 1 }]}
      onPress={onPress}
      disabled={busy}
    >
      <Text style={[styles.btnText, { color: color ? '#fff' : colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── styles ──────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, paddingBottom: 80 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  offText: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 24 },
  title: { ...typography.h2, color: colors.primary, marginBottom: spacing.lg, textAlign: 'center' },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { ...typography.label, color: colors.primary, fontWeight: '700', marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  meta: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
  },
  vs: { ...typography.body, color: colors.textMuted },
  btn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnText: { ...typography.caption, fontWeight: '700' },
  matchChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
    backgroundColor: colors.surface,
  },
  matchChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  matchChipText: { ...typography.caption, color: colors.text, fontWeight: '600' },
  standingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  standingRank: { ...typography.label, color: colors.primary, width: 28, fontWeight: '700' },
  standingName: { ...typography.body, color: colors.text, flex: 1 },
  standingPts: { ...typography.label, color: colors.primary, fontWeight: '700', width: 52, textAlign: 'right' },
  standingMeta: { ...typography.caption, color: colors.textMuted, width: 64, textAlign: 'right' },
  logEntry: { ...typography.caption, lineHeight: 20, fontFamily: 'monospace' },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultTeams: { ...typography.caption, color: colors.text, flex: 1 },
  resultScore: { ...typography.label, color: colors.primary, fontWeight: '700', marginLeft: spacing.sm },
});
