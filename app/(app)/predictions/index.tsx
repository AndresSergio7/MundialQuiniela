import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import { listMyPools } from '@/services/pools.service';
import { fetchAllMatches } from '@/services/matches.service';
import {
  fetchUserPredictions,
  savePredictionsBulk,
  submitQuinielaResult as submitQuiniela,
  getSubmissionStatus,
} from '@/services/predictions.service';
import { PoolSelectorBar } from '@/components/PoolSelectorBar';
import { MatchRow } from '@/components/MatchRow';
import { colors, spacing, radius, shadows } from '@/components/ui/theme';
import { exportPredictionsPdf } from '@/lib/predictionsPdf';
import { getCountryFlagFallback, getCountryFlagSvgUrl, getCountryFlagPngUrl } from '@/lib/flags';
import type { Match, Pool, PredictionMap, Submission } from '@/types';

// ── Secciones ordenadas ──────────────────────────────────────────────────────
const SECTION_ORDER = ['A','B','C','D','E','F','G','H','I','J','K','L','R32','R16','QF','SF','3P','FIN'] as const;
const KNOCKOUT_GROUPS = new Set(['R32','R16','QF','SF','3P','FIN']);
const KNOCKOUT_META: Record<string, { label: string; title: string; subtitle: string }> = {
  R32:  { label: '16avos',   title: 'Ronda de 32',       subtitle: 'Las llaves se definen al terminar la fase de grupos.' },
  R16:  { label: 'Octavos',  title: 'Octavos de Final',  subtitle: 'Las llaves se definen al terminar la Ronda de 32.' },
  QF:   { label: 'Cuartos',  title: 'Cuartos de Final',  subtitle: 'Las llaves se definen al terminar los Octavos.' },
  SF:   { label: 'Semis',    title: 'Semifinales',        subtitle: 'Las llaves se definen al terminar los Cuartos.' },
  '3P': { label: '3° Lugar', title: 'Tercer Lugar',       subtitle: 'Los equipos se definen en las Semifinales.' },
  FIN:  { label: 'Final',    title: 'Gran Final',          subtitle: 'Los equipos se definen en las Semifinales.' },
};
// ─────────────────────────────────────────────────────────────────────────────

type LocalScores = Record<string, { home: string; away: string }>;

type GroupStandingRow = {
  team: string;
  teamCode: string;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

function buildProjectedGroupTable(matches: Match[], localScores: LocalScores): GroupStandingRow[] {
  const rows = new Map<string, GroupStandingRow>();

  function ensureTeam(team: string, teamCode: string) {
    const existing = rows.get(team);
    if (existing) {
      if (!existing.teamCode && teamCode) existing.teamCode = teamCode;
      return existing;
    }
    const next = { team, teamCode, played: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 };
    rows.set(team, next);
    return next;
  }

  for (const match of matches) {
    const home = ensureTeam(match.home_team, match.home_team_code);
    const away = ensureTeam(match.away_team, match.away_team_code);
    const local = localScores[match.id];
    const hasLocalScore = local?.home !== '' && local?.away !== '';
    if (!hasLocalScore) continue;
    const homeScore = Number(local.home);
    const awayScore = Number(local.away);

    if (homeScore == null || awayScore == null) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.points += 3;
    } else if (awayScore > homeScore) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  }

  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      goalDiff: row.goalsFor - row.goalsAgainst,
    }))
    .sort((a, b) => (
      b.points - a.points
      || b.goalDiff - a.goalDiff
      || b.goalsFor - a.goalsFor
      || a.team.localeCompare(b.team)
    ));
}

function GroupFlag({ code }: { code: string }) {
  const fallback = getCountryFlagFallback(code);
  // Web soporta SVG; mobile solo soporta PNG con Image nativo
  const uri = Platform.OS === 'web'
    ? getCountryFlagSvgUrl(code)
    : getCountryFlagPngUrl(code);

  if (!uri) {
    return <Text style={styles.groupPreviewFlag}>{fallback}</Text>;
  }

  return <Image source={{ uri }} style={styles.groupPreviewFlagImage} resizeMode="cover" />;
}


export default function PredictionsScreen() {
  const { user } = useAuthStore();
  const { currentPool } = usePoolStore();
  const insets = useSafeAreaInsets();
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveQueueRef = useRef(Promise.resolve());
  const hasDraftChangesRef = useRef(false);

  const [matches, setMatches] = useState<Match[]>([]);
  const [localScores, setLocalScores] = useState<LocalScores>({});
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [tournamentLocked, setTournamentLocked] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending'>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importablePools, setImportablePools] = useState<Pool[]>([]);
  const [importing, setImporting] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);

  const isFinal = submission?.is_final === true;
  const isLocked = tournamentLocked;

  const loadAll = useCallback(async (pool?: Pool) => {
    const activePool = pool ?? currentPool;
    if (!activePool || !user) return;
    setLoading(true);
    hasDraftChangesRef.current = false;
    setError(null);
    setValidationErrors([]);
    setAutosaveStatus('idle');

    const [allMatches, predictions, sub] = await Promise.all([
      fetchAllMatches(),
      fetchUserPredictions(activePool.id, user.id),
      getSubmissionStatus(activePool.id, user.id),
    ]);

    setMatches(allMatches);
    setSubmission(sub);

    const scores: LocalScores = {};
    for (const m of allMatches) scores[m.id] = { home: '', away: '' };
    for (const p of predictions) {
      scores[p.match_id] = { home: String(p.home_score), away: String(p.away_score) };
    }
    setLocalScores(scores);

    const anyStarted = allMatches.some(
      (m) => m.status === 'live' || m.status === 'finished',
    );
    const scheduledDates = allMatches
      .filter((m) => m.status === 'scheduled' || m.status === 'postponed')
      .map((m) => new Date(m.match_date).getTime());
    const firstMatchMs = scheduledDates.length > 0 ? Math.min(...scheduledDates) : Infinity;
    const locked = anyStarted || Date.now() >= firstMatchMs - 60_000;
    setTournamentLocked(locked);
    setLoading(false);
  }, [currentPool, user]);

  useEffect(() => {
    loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPool?.id]);

  function handleScoreChange(matchId: string, side: 'home' | 'away', val: string) {
    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 2);
    hasDraftChangesRef.current = true;
    setLocalScores(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: cleaned } }));
    setError(null); setValidationErrors([]); setAutosaveStatus('idle');
  }

  // Debe declararse ANTES de filledCount/allFilled que lo consumen
  const groupMatchesEarly = useMemo(
    () => matches.filter(m => !KNOCKOUT_GROUPS.has(m.group_name)),
    [matches],
  );

  const filledCount = useMemo(
    () => groupMatchesEarly.filter(m => {
      const s = localScores[m.id];
      return s?.home !== '' && s?.away !== '';
    }).length,
    [groupMatchesEarly, localScores],
  );
  const allFilled = groupMatchesEarly.length > 0 && filledCount === groupMatchesEarly.length;

  const printableRows = useMemo(
    () => groupMatchesEarly
      .filter(m => localScores[m.id]?.home !== '' && localScores[m.id]?.away !== '')
      .map(m => ({
        match: m,
        homeScore: parseInt(localScores[m.id].home, 10),
        awayScore: parseInt(localScores[m.id].away, 10),
      })),
    [groupMatchesEarly, localScores],
  );

  function buildPredictionMap(): PredictionMap {
    const map: PredictionMap = {};
    for (const [matchId, score] of Object.entries(localScores)) {
      if (score.home !== '' && score.away !== '') {
        map[matchId] = { home: parseInt(score.home, 10), away: parseInt(score.away, 10) };
      }
    }
    return map;
  }

  async function persistPredictions(scores?: PredictionMap) {
    if (!currentPool || !user) return false;
    const payload = scores ?? buildPredictionMap();
    const runSave = async () => {
      setAutosaveStatus('saving');
      const result = await savePredictionsBulk(currentPool.id, user.id, payload);
      if (!result.success) {
        setAutosaveStatus('error');
        setError(result.error ?? 'Error al guardar automáticamente. Intenta de nuevo.');
        return false;
      }
      hasDraftChangesRef.current = false;
      setAutosaveStatus('saved');
      setError(null);
      return true;
    };

    const next = autosaveQueueRef.current.then(runSave, runSave);
    autosaveQueueRef.current = next.then(() => undefined, () => undefined);
    return next;
  }

  async function doSubmit() {
    if (!currentPool || !user) return;
    setError(null); setValidationErrors([]); setAutosaveStatus('idle'); setSubmitting(true);
    const saveResult = await persistPredictions();
    if (!saveResult) {
      setSubmitting(false); setShowConfirmSubmit(false);
      return;
    }
    const submitResult = await submitQuiniela(currentPool.id, user.id);
    setSubmitting(false); setShowConfirmSubmit(false);
    if (submitResult.success) {
      const sub = await getSubmissionStatus(currentPool.id, user.id);
      setSubmission(sub);
      setShowSuccessModal(true);
    } else {
      setValidationErrors(submitResult.errors);
      setError('Tu quiniela tiene errores. Corrígelos y vuelve a enviar.');
    }
  }

  async function handleExportPdf() {
    if (!currentPool) return;

    if (printableRows.length === 0) {
      setError('Llena al menos un partido para poder imprimir la quiniela.');
      return;
    }

    const userLabel = user?.user_metadata?.username ?? user?.email ?? undefined;

    setError(null);
    setExportingPdf(true);

    try {
      await exportPredictionsPdf({
        poolName: currentPool.name,
        generatedAt: new Date(),
        userLabel,
        rows: printableRows,
      });
    } catch {
      setError('No se pudo generar el PDF. Intenta de nuevo.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleImportOpen() {
    if (!user || !currentPool) return;
    const allPools = await listMyPools(user.id);
    setImportablePools(allPools.filter(p => p.id !== currentPool.id));
    setShowImportModal(true);
  }

  async function handleImportFrom(sourcePool: Pool) {
    if (!user || !currentPool) return;
    setImporting(true);
    setShowImportModal(false);
    try {
      const preds = await fetchUserPredictions(sourcePool.id, user.id);
      if (preds.length === 0) {
        setError(`"${sourcePool.name}" no tiene predicciones guardadas.`);
        setImporting(false);
        return;
      }
      const newScores: LocalScores = { ...localScores };
      for (const p of preds) {
        newScores[p.match_id] = { home: String(p.home_score), away: String(p.away_score) };
      }
      hasDraftChangesRef.current = false;
      setLocalScores(newScores);
      const predMap: PredictionMap = {};
      for (const p of preds) {
        predMap[p.match_id] = { home: p.home_score, away: p.away_score };
      }
      await persistPredictions(predMap);
    } catch {
      setError('No se pudo importar. Intenta de nuevo.');
    } finally {
      setImporting(false);
    }
  }

  const groupNames = useMemo(() => {
    const names = Array.from(new Set(matches.map(m => m.group_name)));
    return names.sort((a, b) => {
      const ia = SECTION_ORDER.indexOf(a as typeof SECTION_ORDER[number]);
      const ib = SECTION_ORDER.indexOf(b as typeof SECTION_ORDER[number]);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [matches]);

  const groupedMatchMap = useMemo(() => {
    const map: Record<string, Match[]> = {};
    for (const m of matches) {
      if (!map[m.group_name]) map[m.group_name] = [];
      map[m.group_name].push(m);
    }
    return map;
  }, [matches]);

  useEffect(() => {
    if (groupNames.length > 0 && activeGroup === null) {
      setActiveGroup(groupNames[0]);
    }
  }, [groupNames]);

  const activeGroupMatches = useMemo(
    () => (activeGroup ? groupedMatchMap[activeGroup] ?? [] : []),
    [activeGroup, groupedMatchMap],
  );

  const projectedGroupTable = useMemo(
    () => activeGroup && !KNOCKOUT_GROUPS.has(activeGroup)
      ? buildProjectedGroupTable(activeGroupMatches, localScores)
      : [],
    [activeGroup, activeGroupMatches, localScores],
  );

  const groupStats = useMemo(
    () => groupNames.map(name => {
      const ms = groupedMatchMap[name] ?? [];
      const filled = ms.filter(m => {
        const s = localScores[m.id];
        return s?.home !== '' && s?.away !== '';
      }).length;
      return { title: name, total: ms.length, filled };
    }),
    [groupNames, groupedMatchMap, localScores],
  );

  const visibleMatches = useMemo(() => {
    // Playoff sin equipos definidos → lista vacía (se muestra estado bloqueado)
    if (activeGroup && KNOCKOUT_GROUPS.has(activeGroup)) return [];
    let result = activeGroup ? (groupedMatchMap[activeGroup] ?? []) : groupMatchesEarly;
    if (activeFilter === 'pending') {
      result = result.filter(m => {
        const s = localScores[m.id];
        return !s || s.home === '' || s.away === '';
      });
    }
    return result;
  }, [activeGroup, groupedMatchMap, groupMatchesEarly, activeFilter, localScores]);

  const activeGroupComplete = useMemo(() => {
    if (!activeGroup) return false;
    const stat = groupStats.find(g => g.title === activeGroup);
    return stat ? stat.filled === stat.total : false;
  }, [activeGroup, groupStats]);

  useEffect(() => {
    if (!currentPool || !user || loading || tournamentLocked || !hasDraftChangesRef.current) {
      return;
    }

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void persistPredictions();
    }, 700);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [currentPool?.id, user?.id, loading, tournamentLocked, localScores]);

  useEffect(() => () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
  }, []);

  const pct = groupMatchesEarly.length > 0 ? Math.round((filledCount / groupMatchesEarly.length) * 100) : 0;
  const showEditActions = !tournamentLocked;

  if (!currentPool) {
    return (
      <View style={styles.centered}>
        <Ionicons name="football-outline" size={48} color={colors.textLight} />
        <Text style={styles.noPool}>Selecciona una quiniela desde Inicio</Text>
      </View>
    );
  }

  const ListHeader = (
    <View>
      {/* Progress bar */}
      <View style={styles.progressCard}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{filledCount} / {groupMatchesEarly.length} partidos (fase grupos)</Text>
          <Text style={styles.progressPct}>{pct}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        {isFinal && !tournamentLocked && (
          <View style={[styles.submittedInlineBadge, { marginTop: spacing.xs }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.submittedInlineText}>Enviada — puedes seguir editando</Text>
          </View>
        )}
        {tournamentLocked && (
          <View style={[styles.submittedInlineBadge, { marginTop: spacing.xs }]}>
            <Ionicons name="shield-checkmark" size={14} color={colors.accent} />
            <Text style={styles.submittedInlineText}>
              {isFinal ? 'Quiniela enviada — torneo en curso' : 'El torneo ya inició — solo lectura'}
            </Text>
          </View>
        )}
      </View>

      {/* Todos / Pendientes tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'pending'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterTabText, activeFilter === f && styles.filterTabTextActive]}>
              {f === 'all' ? 'Todos' : 'Pendientes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Group chips — single select */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupChipsScroll}>
        {groupStats.map((g, idx) => {
          const isKnockout = KNOCKOUT_GROUPS.has(g.title);
          const prevIsGroup = idx > 0 && !KNOCKOUT_GROUPS.has(groupStats[idx - 1].title);
          const complete = !isKnockout && g.filled === g.total;
          const active = activeGroup === g.title;
          const chipLabel = isKnockout ? (KNOCKOUT_META[g.title]?.label ?? g.title) : g.title;
          return (
            <React.Fragment key={g.title}>
              {/* Separador visual entre grupos y playoffs */}
              {isKnockout && prevIsGroup && (
                <View style={styles.chipsPlayoffSep}>
                  <View style={styles.chipsPlayoffSepLine} />
                </View>
              )}
              <TouchableOpacity
                style={[
                  styles.groupChip,
                  active && styles.groupChipActive,
                  isKnockout && styles.groupChipKnockout,
                  isKnockout && active && styles.groupChipKnockoutActive,
                ]}
                onPress={() => setActiveGroup(g.title)}
              >
                {complete && <View style={styles.groupCompleteDot} />}
                {isKnockout && (
                  <Ionicons
                    name="lock-closed"
                    size={9}
                    color={active ? 'rgba(255,255,255,0.65)' : colors.textLight}
                    style={{ marginBottom: 1 }}
                  />
                )}
                <Text style={[
                  styles.groupChipText,
                  active && styles.groupChipTextActive,
                  isKnockout && !active && styles.groupChipTextKnockout,
                ]}>
                  {chipLabel}
                </Text>
                {!isKnockout && (
                  <Text style={[styles.groupChipSub, active && styles.groupChipSubActive]}>{g.filled}/{g.total}</Text>
                )}
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </ScrollView>

      {activeGroup && projectedGroupTable.length > 0 && (
        <View style={styles.groupPreviewCard}>
          <View style={styles.groupPreviewHeader}>
            <View>
              <Text style={styles.groupPreviewEyebrow}>CLASIFICACIÓN PROYECTADA</Text>
              <Text style={styles.groupPreviewTitle}>Grupo {activeGroup}</Text>
            </View>
          </View>

          <View style={styles.groupPreviewTableHead}>
            <Text style={[styles.groupPreviewCol, styles.groupPreviewColRank]}>#</Text>
            <Text style={[styles.groupPreviewCol, styles.groupPreviewColTeam]}>Equipo</Text>
            <Text style={styles.groupPreviewCol}>PJ</Text>
            <Text style={styles.groupPreviewCol}>GF</Text>
            <Text style={styles.groupPreviewCol}>GC</Text>
            <Text style={styles.groupPreviewCol}>DG</Text>
            <Text style={styles.groupPreviewColPts}>Pts</Text>
          </View>

          {projectedGroupTable.map((row, index) => (
            <View key={row.team} style={styles.groupPreviewRow}>
              <Text style={[styles.groupPreviewCell, styles.groupPreviewCellRank]}>{index + 1}</Text>
              <View style={[styles.groupPreviewCell, styles.groupPreviewTeamCell]}>
                <GroupFlag code={row.teamCode} />
                <Text numberOfLines={1} style={styles.groupPreviewTeamName}>{row.team}</Text>
              </View>
              <Text style={styles.groupPreviewCell}>{row.played}</Text>
              <Text style={styles.groupPreviewCell}>{row.goalsFor}</Text>
              <Text style={styles.groupPreviewCell}>{row.goalsAgainst}</Text>
              <Text style={styles.groupPreviewCell}>{row.goalDiff > 0 ? `+${row.goalDiff}` : String(row.goalDiff)}</Text>
              <Text style={styles.groupPreviewCellPts}>{row.points}</Text>
            </View>
          ))}

          <Text style={styles.groupPreviewNote}>Se calcula con tus marcadores guardados para este grupo.</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {validationErrors.length > 0 && (
        <View style={styles.errorBanner}>
          {validationErrors.map((e, i) => (
            <Text key={i} style={styles.errorText}>• {e}</Text>
          ))}
        </View>
      )}
      {autosaveStatus === 'error' && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.errorText}>No se pudo guardar automáticamente. Revisa tu conexión.</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      <PoolSelectorBar
        contextLabel="MI QUINIELA"
        rightBadgeText={`${filledCount}/${groupMatchesEarly.length}`}
        onPoolChange={pool => loadAll(pool)}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={visibleMatches}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => loadAll()} tintColor={colors.accent} />
          }
          ListHeaderComponent={ListHeader}
          renderItem={({ item: match }) => (
            <MatchRow
              match={match}
              homeScore={localScores[match.id]?.home ?? ''}
              awayScore={localScores[match.id]?.away ?? ''}
              locked={isLocked}
              onHomeChange={v => handleScoreChange(match.id, 'home', v)}
              onAwayChange={v => handleScoreChange(match.id, 'away', v)}
            />
          )}
          ListEmptyComponent={
            activeGroup && KNOCKOUT_GROUPS.has(activeGroup) ? (
              <View style={styles.knockoutLocked}>
                <View style={styles.knockoutLockedIcon}>
                  <Ionicons name="lock-closed" size={30} color={colors.textLight} />
                </View>
                <Text style={styles.knockoutLockedTitle}>
                  {KNOCKOUT_META[activeGroup]?.title ?? activeGroup}
                </Text>
                <Text style={styles.knockoutLockedSub}>
                  {KNOCKOUT_META[activeGroup]?.subtitle}
                  {'\n'}Podrás capturar tus predicciones cuando se definan los equipos.
                </Text>
                <View style={styles.knockoutLockedBadge}>
                  <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.knockoutLockedBadgeText}>Próximamente</Text>
                </View>
              </View>
            ) : activeFilter === 'pending' && activeGroupComplete ? (
              <View style={styles.completeState}>
                <Text style={styles.completeIcon}>✅</Text>
                <Text style={styles.completeTitle}>¡Grupo {activeGroup} completo!</Text>
                <Text style={styles.completeSub}>Cámbiate a "Todos" para revisar o editar tus marcadores</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            <View style={styles.footer}>
              {!allFilled && !tournamentLocked && (
                <Text style={styles.hint}>
                  Faltan {groupMatchesEarly.length - filledCount} partido{groupMatchesEarly.length - filledCount !== 1 ? 's' : ''} para poder enviar
                </Text>
              )}
            </View>
          }
        />
      )}

      {!loading && (
        <View pointerEvents="box-none" style={[styles.fabWrap, { bottom: insets.bottom + 64 }]}>
          <TouchableOpacity
            style={[styles.fab, showFabMenu && styles.fabActive]}
            activeOpacity={0.85}
            onPress={() => setShowFabMenu(v => !v)}
          >
            <Ionicons name={showFabMenu ? 'close' : 'flash'} size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* FAB Menu — Modal para z-index correcto en Android */}
      <Modal
        visible={!loading && showFabMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFabMenu(false)}
      >
        <View style={StyleSheet.absoluteFillObject}>
          {/* Backdrop táctil */}
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowFabMenu(false)}
          />

          {/* Card del menú anclada arriba del FAB */}
          <View style={[styles.fabMenuCard, { bottom: insets.bottom + 78 + 64 + 52 + 12, right: spacing.md }]}>
            {/* Enviar / Reenviar */}
            {showEditActions && (
              <TouchableOpacity
                style={[
                  styles.fabMenuItem,
                  styles.fabMenuItemAccent,
                  (!allFilled || submitting || importing || autosaveStatus === 'saving') && styles.fabMenuItemDisabled,
                ]}
                onPress={() => { setShowFabMenu(false); setShowConfirmSubmit(true); }}
                disabled={!allFilled || submitting || importing || autosaveStatus === 'saving'}
                activeOpacity={0.82}
              >
                {submitting
                  ? <ActivityIndicator size="small" color={colors.navy} />
                  : <Ionicons name="send" size={16} color={colors.navy} />
                }
                <Text style={styles.fabMenuItemTextAccent}>
                  {isFinal ? 'Reenviar quiniela' : 'Enviar quiniela'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Importar */}
            {showEditActions && (
              <TouchableOpacity
                style={[
                  styles.fabMenuItem,
                  (submitting || importing || autosaveStatus === 'saving') && styles.fabMenuItemDisabled,
                ]}
                onPress={() => { setShowFabMenu(false); handleImportOpen(); }}
                disabled={submitting || importing || autosaveStatus === 'saving'}
                activeOpacity={0.82}
              >
                {importing
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Ionicons name="copy-outline" size={16} color={colors.primary} />
                }
                <Text style={styles.fabMenuItemText}>Importar predicciones</Text>
              </TouchableOpacity>
            )}

            {/* PDF */}
            <TouchableOpacity
              style={[
                styles.fabMenuItem,
                (printableRows.length === 0 || exportingPdf) && styles.fabMenuItemDisabled,
              ]}
              onPress={() => { setShowFabMenu(false); handleExportPdf(); }}
              disabled={printableRows.length === 0 || exportingPdf}
              activeOpacity={0.82}
            >
              {exportingPdf
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name="document-text-outline" size={16} color={colors.primary} />
              }
              <Text style={styles.fabMenuItemText}>Descargar PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirm submit */}
      <Modal visible={showConfirmSubmit} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="football" size={28} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>¿Enviar quiniela?</Text>
            <Text style={styles.modalBody}>
              Tu quiniela quedará registrada. Podrás seguir editando hasta 1 minuto antes de que inicie el primer partido del mundial.
            </Text>
            {submitting ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
            ) : (
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnOutline]}
                  onPress={() => setShowConfirmSubmit(false)}
                >
                  <Text style={[styles.modalBtnText, { color: colors.textMuted }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                  onPress={doSubmit}
                >
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Import predictions modal */}
      <Modal visible={showImportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '70%' }]}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="copy-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Importar predicciones</Text>
            <Text style={styles.modalBody}>
              Selecciona la quiniela de la que quieres copiar tus predicciones. Se guardarán automáticamente.
            </Text>
            {importablePools.length === 0 ? (
              <Text style={[styles.modalBody, { marginTop: spacing.md, color: colors.textMuted }]}>
                No tienes otras quinielas con predicciones para importar.
              </Text>
            ) : (
              <ScrollView style={{ width: '100%', marginTop: spacing.md }}>
                {importablePools.map(pool => (
                  <TouchableOpacity
                    key={pool.id}
                    style={styles.importPoolItem}
                    onPress={() => handleImportFrom(pool)}
                  >
                    <View style={styles.importPoolIcon}>
                      <Ionicons name="football-outline" size={18} color={colors.primary} />
                    </View>
                    <Text style={styles.importPoolName} numberOfLines={1}>{pool.name}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnOutline, { marginTop: spacing.md, alignSelf: 'stretch' }]}
              onPress={() => setShowImportModal(false)}
            >
              <Text style={[styles.modalBtnText, { color: colors.textMuted }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={[styles.modalIconWrap, styles.modalIconSuccess]}>
              <Ionicons name="trophy" size={32} color={colors.accent} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>¡Quiniela enviada!</Text>
            <Text style={styles.modalBody}>
              Tu quiniela ha sido registrada. Puedes seguir editando hasta que inicie el mundial. ¡Buena suerte!
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnPrimary, { alignSelf: 'center', marginTop: spacing.lg }]}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  noPool: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  list: { padding: spacing.md, paddingBottom: spacing.xxl * 4 },

  groupHeader: {
    backgroundColor: '#08213E',
    paddingVertical: spacing.xs + 3,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#123A69',
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1.1,
  },
  groupPill: {
    backgroundColor: 'rgba(201,168,76,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.45)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs + 3,
    paddingVertical: 2,
  },
  groupPillText: {
    fontSize: 10,
    color: '#F8E7B2',
    fontWeight: '700',
  },

  filterTabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    padding: 3,
  },
  filterTab: {
    flex: 1, paddingVertical: 7, borderRadius: radius.full, alignItems: 'center',
  },
  filterTabActive: { backgroundColor: colors.navy },
  filterTabText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  filterTabTextActive: { color: '#fff' },
  groupChipsScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  groupChip: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 58,
    position: 'relative',
  },
  groupChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  groupCompleteDot: {
    position: 'absolute', top: 4, right: 4,
    width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#16A34A',
  },
  groupChipText: { fontSize: 14, fontWeight: '800', color: colors.text },
  groupChipTextActive: { color: '#fff' },
  groupChipSub: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  groupChipSubActive: { color: 'rgba(255,255,255,0.65)' },
  completeState: { alignItems: 'center', paddingVertical: spacing.xxl },
  completeIcon: { fontSize: 48, marginBottom: spacing.md },
  completeTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  completeSub: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },

  // Playoff chips
  groupChipKnockout: {
    borderColor: '#CBD5D1',
    backgroundColor: '#F4F7F5',
    borderStyle: 'dashed',
  },
  groupChipKnockoutActive: {
    backgroundColor: '#475569',
    borderColor: '#475569',
    borderStyle: 'solid',
  },
  groupChipTextKnockout: {
    fontSize: 11,
    color: colors.textMuted,
  },
  chipsPlayoffSep: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  chipsPlayoffSepLine: {
    width: 1.5,
    height: 28,
    backgroundColor: '#D1DAD5',
    borderRadius: 1,
  },

  // Playoff estado bloqueado
  knockoutLocked: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  knockoutLockedIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F1F5F2',
    borderWidth: 1.5,
    borderColor: '#D1DAD5',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  knockoutLockedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  knockoutLockedSub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  knockoutLockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    marginTop: spacing.xs,
  },
  knockoutLockedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },

  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  progressLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  progressPct: { fontSize: 13, fontWeight: '800', color: colors.primary },
  progressTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  finalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent + '50',
  },
  finalBannerText: { fontSize: 14, fontWeight: '700', color: colors.navy },
  submittedInlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successLight,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  submittedInlineText: { fontSize: 11, color: colors.success, fontWeight: '700', flex: 1 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error + '40',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: { fontSize: 12, color: colors.error, flex: 1 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  successText: { fontSize: 12, color: colors.success, fontWeight: '700' },

  footer: { marginTop: spacing.lg, paddingBottom: spacing.xxl },
  submittedCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.accentLight,
    borderWidth: 2,
    borderColor: colors.accent + '60',
    gap: spacing.sm,
  },
  submittedCardTitle: { fontSize: 18, fontWeight: '800', color: colors.navy },
  submittedCardSub: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  hint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  // FAB expandible
  fabBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  fabWrap: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 11,
    alignItems: 'flex-end',
  },
  fabMenu: {
    position: 'absolute',
    gap: spacing.xs + 2,
    alignItems: 'flex-end',
  },
  fabMenuCard: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D3E4D9',
    minWidth: 210,
    ...shadows.lg,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#fff',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF4F0',
  },
  fabMenuItemAccent: {
    backgroundColor: colors.accent,
    borderBottomColor: '#C69812',
  },
  fabMenuItemDisabled: { opacity: 0.4 },
  fabMenuItemText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
    fontFamily: 'BarlowCondensed_700Bold',
  },
  fabMenuItemTextAccent: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.navy,
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0D5A3A',
    borderWidth: 1,
    borderColor: '#0A492F',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  fabActive: {
    backgroundColor: '#444F57',
    borderColor: '#2E363C',
  },

  groupPreviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#DDE5DF',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  groupPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  groupPreviewEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.primary,
  },
  groupPreviewTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginTop: 2,
  },
  groupPreviewBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accent + '60',
  },
  groupPreviewBadgeText: { fontSize: 11, fontWeight: '800', color: colors.navy },
  groupPreviewTableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECE9',
    marginBottom: 4,
  },
  groupPreviewCol: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    textAlign: 'center',
    width: 28,
  },
  groupPreviewColRank: { width: 20, textAlign: 'left' },
  groupPreviewColTeam: { flex: 1, textAlign: 'left', width: 'auto' },
  groupPreviewColPts: { width: 32, textAlign: 'right' },
  groupPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F4F2',
  },
  groupPreviewCell: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
    width: 28,
  },
  groupPreviewCellRank: { width: 20, textAlign: 'left', color: colors.textMuted },
  groupPreviewTeamCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 'auto',
    textAlign: 'left',
  },
  groupPreviewFlag: { fontSize: 16 },
  groupPreviewFlagImage: {
    width: 18,
    height: 13,
    borderRadius: 2,
    backgroundColor: '#EEF2EF',
  },
  groupPreviewTeamName: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    fontWeight: '800',
  },
  groupPreviewCellPts: {
    width: 32,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  groupPreviewNote: {
    marginTop: spacing.xs,
    fontSize: 11,
    color: colors.textMuted,
  },

  autosaveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  autosaveText: { fontSize: 12, color: colors.primaryDark, fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    ...shadows.lg,
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalIconSuccess: { backgroundColor: colors.accentLight },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: spacing.xs, textAlign: 'center' },
  modalBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
  modalButtons: { flexDirection: 'row', marginTop: spacing.xl, gap: spacing.sm, width: '100%' },
  modalBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  modalBtnOutline: { borderWidth: 1.5, borderColor: colors.border },
  modalBtnPrimary: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl },
  modalBtnText: { fontSize: 15, fontWeight: '700' },
  importPoolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  importPoolIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAF6EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10,107,53,0.2)',
  },
  importPoolName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
});
