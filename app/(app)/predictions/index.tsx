import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import { fetchAllMatches } from '@/services/matches.service';
import {
  fetchUserPredictions,
  savePredictionsBulk,
  submitQuinielaResult as submitQuiniela,
  getSubmissionStatus,
} from '@/services/predictions.service';
import { PoolSelectorBar } from '@/components/PoolSelectorBar';
import { MatchRow } from '@/components/MatchRow';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, radius, shadows } from '@/components/ui/theme';
import { exportPredictionsPdf } from '@/lib/predictionsPdf';
import type { Match, Submission, PredictionMap, Pool } from '@/types';

type LocalScores = Record<string, { home: string; away: string }>;

export default function PredictionsScreen() {
  const { user } = useAuthStore();
  const { currentPool } = usePoolStore();

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
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [tournamentLocked, setTournamentLocked] = useState(false);

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

  const groupedMatches = useMemo(() => {
    const groups: Record<string, Match[]> = {};
    for (const m of matches) {
      if (!groups[m.group_name]) groups[m.group_name] = [];
      groups[m.group_name].push(m);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [matches]);

  useEffect(() => {
    if (groupedMatches.length === 0) return;

    setCollapsedGroups(prev => {
      const next: Record<string, boolean> = { ...prev };
      let changed = false;

      for (const [idx, group] of groupedMatches.entries()) {
        if (next[group.title] === undefined) {
          next[group.title] = idx !== 0;
          changed = true;
        }
      }

      for (const key of Object.keys(next)) {
        if (!groupedMatches.find(g => g.title === key)) {
          delete next[key];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [groupedMatches]);

  const groupStats = useMemo(
    () => groupedMatches.map(group => {
      const filled = group.data.filter(m => {
        const s = localScores[m.id];
        return s?.home !== '' && s?.away !== '';
      }).length;

      return {
        title: group.title,
        total: group.data.length,
        filled,
      };
    }),
    [groupedMatches, localScores],
  );

  function toggleGroup(title: string) {
    setCollapsedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  }

  function expandAllGroups() {
    setCollapsedGroups(prev => {
      const next = { ...prev };
      for (const g of groupedMatches) next[g.title] = false;
      return next;
    });
  }

  function collapseAllGroups() {
    setCollapsedGroups(prev => {
      const next = { ...prev };
      for (const g of groupedMatches) next[g.title] = true;
      return next;
    });
  }

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

  return (
    <View style={styles.screen}>
      <PoolSelectorBar onPoolChange={pool => loadAll(pool)} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <SectionList
          sections={groupedMatches}
          keyExtractor={m => m.id}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => loadAll()} tintColor={colors.accent} />
          }
          renderSectionHeader={({ section }) => (
            <TouchableOpacity
              style={styles.groupHeader}
              activeOpacity={0.9}
              onPress={() => toggleGroup(section.title)}
            >
              <View style={styles.groupHeaderLeft}>
                <Text style={styles.groupLabel}>GRUPO {section.title}</Text>
                <View style={styles.groupPill}>
                  <Text style={styles.groupPillText}>
                    {groupStats.find(g => g.title === section.title)?.filled ?? 0}/{section.data.length}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={collapsedGroups[section.title] ? 'chevron-down' : 'chevron-up'}
                size={16}
                color={colors.accent}
              />
            </TouchableOpacity>
          )}
          renderItem={({ item: match, section }) => {
            if (collapsedGroups[section.title]) return null;

            return (
              <MatchRow
                match={match}
                homeScore={localScores[match.id]?.home ?? ''}
                awayScore={localScores[match.id]?.away ?? ''}
                locked={isLocked}
                onHomeChange={v => handleScoreChange(match.id, 'home', v)}
                onAwayChange={v => handleScoreChange(match.id, 'away', v)}
              />
            );
          }}
          ListHeaderComponent={
            <View>
              {/* Status / progress bar */}
              {tournamentLocked ? (
                <View style={styles.finalBanner}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
                  <Text style={styles.finalBannerText}>
                    {isFinal ? 'Quiniela enviada y bloqueada' : 'El torneo ya inició — no se puede editar'}
                  </Text>
                </View>
              ) : (
                <View style={styles.progressCard}>
                  {isFinal && (
                    <View style={styles.submittedInlineBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={styles.submittedInlineText}>Enviada — puedes seguir editando hasta que inicie el mundial</Text>
                    </View>
                  )}
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>
                      {filledCount} / {matches.length} partidos
                    </Text>
                    <Text style={styles.progressPct}>{pct}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%` }]} />
                  </View>
                </View>
              )}

              <View style={styles.groupToolsWrap}>
                <View style={styles.groupToolsTop}>
                  <Text style={styles.groupToolsTitle}>Navega por grupos</Text>
                  <View style={styles.groupToolsBtns}>
                    <TouchableOpacity style={styles.groupToolsBtn} onPress={expandAllGroups}>
                      <Text style={styles.groupToolsBtnText}>Expandir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.groupToolsBtn} onPress={collapseAllGroups}>
                      <Text style={styles.groupToolsBtnText}>Contraer</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.groupChipsScroll}
                >
                  {groupStats.map(g => {
                    const isCollapsed = collapsedGroups[g.title];
                    return (
                      <TouchableOpacity
                        key={g.title}
                        style={[styles.groupChip, !isCollapsed && styles.groupChipActive]}
                        onPress={() => toggleGroup(g.title)}
                      >
                        <Text style={[styles.groupChipText, !isCollapsed && styles.groupChipTextActive]}>
                          {g.title}
                        </Text>
                        <Text style={[styles.groupChipSub, !isCollapsed && styles.groupChipSubActive]}>
                          {g.filled}/{g.total}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

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
          }
          ListFooterComponent={
            <View style={styles.footer}>
              {tournamentLocked ? (
                <Card style={styles.submittedCard}>
                  <Ionicons name="shield-checkmark" size={32} color={colors.accent} />
                  <Text style={styles.submittedCardTitle}>Quiniela Bloqueada</Text>
                  <Text style={styles.submittedCardSub}>El torneo ya inició.</Text>
                </Card>
              ) : null}
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
        <View pointerEvents="box-none" style={styles.floatingWrap}>
          <View style={styles.floatingBar}>
            <View style={styles.floatingTopRow}>
              <Text style={styles.floatingTitle}>Acciones rapidas</Text>
              <Text style={styles.floatingMeta}>{filledCount}/{matches.length} llenados</Text>
            </View>

            <View style={styles.floatingButtonsRow}>
              {showEditActions && (
                <>
                  <Button
                    title={saving ? 'Guardando…' : 'Guardar'}
                    variant="secondary"
                    size="sm"
                    onPress={handleSaveAll}
                    loading={saving}
                    disabled={filledCount === 0 || saving || submitting}
                    fullWidth={false}
                    icon={<Ionicons name="save-outline" size={16} color="#fff" />}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title={isFinal ? 'Re-enviar' : 'Enviar'}
                    size="sm"
                    variant="gold"
                    onPress={() => setShowConfirmSubmit(true)}
                    disabled={!allFilled || saving || submitting}
                    fullWidth={false}
                    icon={<Ionicons name="send" size={16} color={colors.navy} />}
                    style={{ flex: 1.1 }}
                  />
                </>
              )}

              <Button
                title={exportingPdf ? 'Generando…' : 'PDF'}
                variant="outline"
                size="sm"
                onPress={handleExportPdf}
                disabled={printableRows.length === 0 || exportingPdf}
                loading={exportingPdf}
                fullWidth={false}
                icon={<Ionicons name="print-outline" size={16} color={colors.primary} />}
                style={{ flex: showEditActions ? 0.9 : 1 }}
              />
            </View>
          </View>
        </View>
      )}

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

  groupToolsWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  groupToolsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  groupToolsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  groupToolsBtns: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  groupToolsBtn: {
    borderWidth: 1,
    borderColor: '#CCE0F7',
    backgroundColor: '#F6FAFF',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  groupToolsBtnText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700',
  },
  groupChipsScroll: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  groupChip: {
    borderWidth: 1,
    borderColor: '#CFE0F1',
    borderRadius: radius.md,
    backgroundColor: '#F8FBFF',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 54,
    alignItems: 'center',
  },
  groupChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  groupChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },
  groupChipTextActive: {
    color: colors.accentBright,
  },
  groupChipSub: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  groupChipSubActive: {
    color: '#C5D8F0',
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
  floatingWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  floatingBar: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl + 2,
    borderWidth: 1,
    borderColor: '#D4E2F1',
    padding: spacing.sm,
    gap: spacing.sm,
    ...shadows.lg,
  },
  floatingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  floatingTitle: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  floatingMeta: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
  },
  floatingButtonsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },

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
});
