import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import type { Match, Pool, PredictionMap, Submission } from '@/types';

type LocalScores = Record<string, { home: string; away: string }>;

interface QuickActionChipProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'primary' | 'accent' | 'soft';
  style?: object;
}

function QuickActionChip({
  title,
  icon,
  onPress,
  disabled = false,
  loading = false,
  tone = 'soft',
  style,
}: QuickActionChipProps) {
  const isDisabled = disabled || loading;
  const chipToneStyle =
    tone === 'primary' ? styles.quickActionChipPrimary : tone === 'accent' ? styles.quickActionChipAccent : styles.quickActionChipSoft;
  const iconToneStyle =
    tone === 'primary' ? styles.quickActionIconPrimary : tone === 'accent' ? styles.quickActionIconAccent : styles.quickActionIconSoft;
  const iconColor = tone === 'primary' ? '#FFFFFF' : tone === 'accent' ? colors.navy : colors.primary;
  const textToneStyle =
    tone === 'primary' ? styles.quickActionTextPrimary : tone === 'accent' ? styles.quickActionTextAccent : styles.quickActionTextSoft;

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.quickActionChip, chipToneStyle, isDisabled && styles.quickActionChipDisabled, style]}
    >
      <View style={[styles.quickActionIconWrap, iconToneStyle]}>
        {loading ? <ActivityIndicator size="small" color={iconColor} /> : <Ionicons name={icon} size={15} color={iconColor} />}
      </View>
      <Text numberOfLines={1} style={[styles.quickActionText, textToneStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export default function PredictionsScreen() {
  const { user } = useAuthStore();
  const { currentPool } = usePoolStore();
  const insets = useSafeAreaInsets();

  const [matches, setMatches] = useState<Match[]>([]);
  const [localScores, setLocalScores] = useState<LocalScores>({});
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('edit');
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [savedOk, setSavedOk] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [tournamentLocked, setTournamentLocked] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending'>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importablePools, setImportablePools] = useState<Pool[]>([]);
  const [importing, setImporting] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const isFinal = submission?.is_final === true;
  const isLocked = tournamentLocked;

  const loadAll = useCallback(async (pool?: Pool) => {
    const activePool = pool ?? currentPool;
    if (!activePool || !user) return;
    setLoading(true);
    setError(null);
    setValidationErrors([]);
    setSavedOk(false);

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
    setMode(locked ? 'view' : 'edit');
    setLoading(false);
  }, [currentPool, user]);

  useEffect(() => {
    loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPool?.id]);

  function handleScoreChange(matchId: string, side: 'home' | 'away', val: string) {
    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 2);
    setLocalScores(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: cleaned } }));
    setError(null); setValidationErrors([]); setSavedOk(false);
  }

  const filledCount = useMemo(
    () => Object.values(localScores).filter(s => s.home !== '' && s.away !== '').length,
    [localScores],
  );
  const allFilled = matches.length > 0 && filledCount === matches.length;

  const printableRows = useMemo(
    () => matches
      .filter(m => localScores[m.id]?.home !== '' && localScores[m.id]?.away !== '')
      .map(m => ({
        match: m,
        homeScore: parseInt(localScores[m.id].home, 10),
        awayScore: parseInt(localScores[m.id].away, 10),
      })),
    [matches, localScores],
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

  async function handleSaveAll() {
    if (!currentPool || !user) return;
    if (filledCount === 0) { setError('Ingresa al menos un resultado antes de guardar.'); return; }
    setError(null); setValidationErrors([]); setSavedOk(false);
    setSaving(true);
    const result = await savePredictionsBulk(currentPool.id, user.id, buildPredictionMap());
    setSaving(false);
    if (!result.success) setError(result.error ?? 'Error al guardar. Intenta de nuevo.');
    else setSavedOk(true);
  }

  async function doSubmit() {
    if (!currentPool || !user) return;
    setError(null); setValidationErrors([]); setSavedOk(false); setSubmitting(true);
    const saveResult = await savePredictionsBulk(currentPool.id, user.id, buildPredictionMap());
    if (!saveResult.success) {
      setSubmitting(false); setShowConfirmSubmit(false);
      setError(saveResult.error ?? 'Error al guardar.'); return;
    }
    const submitResult = await submitQuiniela(currentPool.id, user.id);
    setSubmitting(false); setShowConfirmSubmit(false);
    if (submitResult.success) {
      const sub = await getSubmissionStatus(currentPool.id, user.id);
      setSubmission(sub);
      setMode('edit');
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
      setLocalScores(newScores);
      const predMap: PredictionMap = {};
      for (const p of preds) {
        predMap[p.match_id] = { home: p.home_score, away: p.away_score };
      }
      await savePredictionsBulk(currentPool.id, user.id, predMap);
      setSavedOk(true);
      setError(null);
    } catch {
      setError('No se pudo importar. Intenta de nuevo.');
    } finally {
      setImporting(false);
    }
  }

  const groupNames = useMemo(() => {
    const names = Array.from(new Set(matches.map(m => m.group_name))).sort();
    return names;
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
    let result = activeGroup ? (groupedMatchMap[activeGroup] ?? []) : matches;
    if (activeFilter === 'pending') {
      result = result.filter(m => {
        const s = localScores[m.id];
        return !s || s.home === '' || s.away === '';
      });
    }
    return result;
  }, [activeGroup, groupedMatchMap, matches, activeFilter, localScores]);

  const activeGroupComplete = useMemo(() => {
    if (!activeGroup) return false;
    const stat = groupStats.find(g => g.title === activeGroup);
    return stat ? stat.filled === stat.total : false;
  }, [activeGroup, groupStats]);

  const pct = matches.length > 0 ? Math.round((filledCount / matches.length) * 100) : 0;
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
          <Text style={styles.progressLabel}>{filledCount} / {matches.length} partidos</Text>
          <Text style={styles.progressPct}>{pct}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        {isFinal && (
          <View style={[styles.submittedInlineBadge, { marginTop: spacing.xs }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.submittedInlineText}>Enviada — puedes seguir editando</Text>
          </View>
        )}
        {tournamentLocked && !isFinal && (
          <View style={[styles.submittedInlineBadge, { marginTop: spacing.xs }]}>
            <Ionicons name="shield-checkmark" size={14} color={colors.accent} />
            <Text style={styles.submittedInlineText}>El torneo ya inició — solo lectura</Text>
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
        {groupStats.map(g => {
          const complete = g.filled === g.total;
          const active = activeGroup === g.title;
          return (
            <TouchableOpacity
              key={g.title}
              style={[styles.groupChip, active && styles.groupChipActive]}
              onPress={() => setActiveGroup(g.title)}
            >
              {complete && <View style={styles.groupCompleteDot} />}
              <Text style={[styles.groupChipText, active && styles.groupChipTextActive]}>{g.title}</Text>
              <Text style={[styles.groupChipSub, active && styles.groupChipSubActive]}>{g.filled}/{g.total}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
      {savedOk && mode === 'edit' && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={styles.successText}>Guardado</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      <PoolSelectorBar
        contextLabel="MI QUINIELA"
        rightBadgeText={`${filledCount}/${matches.length}`}
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
            activeFilter === 'pending' && activeGroupComplete ? (
              <View style={styles.completeState}>
                <Text style={styles.completeIcon}>✅</Text>
                <Text style={styles.completeTitle}>¡Grupo {activeGroup} completo!</Text>
                <Text style={styles.completeSub}>Cámbiate a “Todos” para revisar o editar tus marcadores</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            <View style={styles.footer}>
              {!allFilled && !tournamentLocked && (
                <Text style={styles.hint}>
                  Faltan {matches.length - filledCount} partido{matches.length - filledCount !== 1 ? 's' : ''} para poder enviar
                </Text>
              )}
            </View>
          }
        />
      )}

      {!loading && (
        <View pointerEvents="box-none" style={[styles.floatingWrap, { bottom: insets.bottom + 76 }]}>
          <TouchableOpacity
            style={styles.fabButton}
            activeOpacity={0.88}
            onPress={() => setShowQuickActions(true)}
          >
            <View style={styles.fabIconWrap}>
              <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showQuickActions} transparent animationType="fade" onRequestClose={() => setShowQuickActions(false)}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.quickSheetOverlay}
          onPress={() => setShowQuickActions(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.quickSheet} onPress={() => {}}>
            <View style={styles.quickSheetHeader}>
              <View>
                <Text style={styles.quickSheetTitle}>Acciones rápidas</Text>
                <Text style={styles.quickSheetMeta}>{filledCount}/{matches.length} llenados</Text>
              </View>
              <TouchableOpacity style={styles.quickSheetClose} onPress={() => setShowQuickActions(false)}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.floatingButtonsStack}>
              {showEditActions && (
                <View style={styles.floatingButtonsRow}>
                  <QuickActionChip
                    title={saving ? 'Guardando…' : 'Guardar'}
                    icon="save-outline"
                    tone="primary"
                    onPress={() => {
                      setShowQuickActions(false);
                      handleSaveAll();
                    }}
                    loading={saving}
                    disabled={filledCount === 0 || saving || submitting || importing}
                    style={styles.quickActionGrow}
                  />
                  <QuickActionChip
                    title={isFinal ? 'Reenviar' : 'Enviar'}
                    icon="send"
                    tone="accent"
                    onPress={() => {
                      setShowQuickActions(false);
                      setShowConfirmSubmit(true);
                    }}
                    disabled={!allFilled || saving || submitting || importing}
                    style={styles.quickActionGrow}
                  />
                </View>
              )}

              <View style={styles.floatingButtonsRow}>
                {showEditActions && (
                  <QuickActionChip
                    title={importing ? 'Importando…' : 'Importar'}
                    icon="copy-outline"
                    tone="soft"
                    onPress={() => {
                      setShowQuickActions(false);
                      handleImportOpen();
                    }}
                    loading={importing}
                    disabled={saving || submitting || importing}
                    style={styles.quickActionGrow}
                  />
                )}
                <QuickActionChip
                  title={exportingPdf ? 'Generando…' : 'PDF'}
                  icon="print-outline"
                  tone="soft"
                  onPress={() => {
                    setShowQuickActions(false);
                    handleExportPdf();
                  }}
                  loading={exportingPdf}
                  disabled={printableRows.length === 0 || exportingPdf}
                  style={styles.quickActionGrow}
                />
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
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
  floatingWrap: {
    position: 'absolute',
    right: spacing.md,
  },
  fabButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0D5A3A',
    borderWidth: 1,
    borderColor: '#0A492F',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  fabIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13,27,42,0.28)',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  quickSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D6E4DA',
    padding: spacing.sm,
    gap: spacing.xs + 2,
    ...shadows.sm,
  },
  quickSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  quickSheetTitle: {
    fontSize: 10,
    color: '#60756A',
    fontWeight: '800',
    letterSpacing: 0.3,
    fontFamily: 'BarlowCondensed_700Bold',
  },
  quickSheetMeta: {
    fontSize: 11,
    color: '#4D6458',
    fontWeight: '800',
    fontFamily: 'BarlowCondensed_700Bold',
  },
  quickSheetClose: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F7F4',
  },
  floatingButtonsStack: { gap: spacing.xs + 2 },
  floatingButtonsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  quickActionGrow: { flex: 1 },
  quickActionChip: {
    minHeight: 42,
    borderRadius: 13,
    paddingHorizontal: spacing.sm + 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 1,
  },
  quickActionChipPrimary: {
    backgroundColor: '#0D5A3A',
    borderWidth: 1,
    borderColor: '#0A492F',
    ...shadows.sm,
  },
  quickActionChipAccent: {
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: '#C69812',
    ...shadows.sm,
  },
  quickActionChipSoft: {
    backgroundColor: '#F6FAF7',
    borderWidth: 1,
    borderColor: '#CFE0D4',
  },
  quickActionChipDisabled: { opacity: 0.55 },
  quickActionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconPrimary: { backgroundColor: 'rgba(255,255,255,0.16)' },
  quickActionIconAccent: { backgroundColor: 'rgba(13,27,42,0.14)' },
  quickActionIconSoft: { backgroundColor: '#E9F2EC' },
  quickActionText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.1,
    fontFamily: 'BarlowCondensed_700Bold',
  },
  quickActionTextPrimary: { color: '#FFFFFF' },
  quickActionTextAccent: { color: colors.navy },
  quickActionTextSoft: { color: '#0D5A3A' },

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
