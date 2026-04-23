import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
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

  const isDeadlinePassed = currentPool
    ? new Date(currentPool.prediction_deadline) <= new Date()
    : false;
  const isFinal = submission?.is_final === true;
  const isLocked = isDeadlinePassed || isFinal || mode === 'view';

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

    const deadlinePast = new Date(activePool.prediction_deadline) <= new Date();
    setMode(sub?.is_final || (sub?.is_valid && !deadlinePast) ? 'view' : 'edit');
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
      setShowSuccessModal(true);
    } else {
      setValidationErrors(submitResult.errors);
      setError('Tu quiniela tiene errores. Corrígelos y vuelve a enviar.');
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

  const pct = matches.length > 0 ? Math.round((filledCount / matches.length) * 100) : 0;

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
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.groupHeader}>
              <Text style={styles.groupLabel}>GRUPO {title}</Text>
            </View>
          )}
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
          ListHeaderComponent={
            <View>
              {/* Status / progress bar */}
              {mode === 'view' && isFinal ? (
                <View style={styles.finalBanner}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
                  <Text style={styles.finalBannerText}>Quiniela enviada y bloqueada</Text>
                </View>
              ) : (
                <View style={styles.progressCard}>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>
                      {filledCount} / {matches.length} partidos
                    </Text>
                    <Text style={styles.progressPct}>{pct}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%` }]} />
                  </View>
                  {isDeadlinePassed && (
                    <Text style={styles.deadlineLabel}>⏰ Plazo cerrado</Text>
                  )}
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
              {isDeadlinePassed ? (
                <Text style={styles.deadlinePassedText}>
                  El plazo de predicciones ha cerrado.
                </Text>
              ) : mode === 'view' ? (
                <Card style={styles.submittedCard}>
                  <Ionicons name="shield-checkmark" size={32} color={isFinal ? colors.accent : colors.primary} />
                  <Text style={styles.submittedCardTitle}>
                    {isFinal ? 'Quiniela Bloqueada' : 'Quiniela Válida'}
                  </Text>
                  <Text style={styles.submittedCardSub}>
                    {isFinal
                      ? 'Tu quiniela fue enviada definitivamente.'
                      : 'Puedes modificar hasta el cierre.'}
                  </Text>
                  {!isFinal && (
                    <Button
                      title="Modificar"
                      variant="outline"
                      onPress={() => { setMode('edit'); setError(null); }}
                      style={{ marginTop: spacing.md }}
                    />
                  )}
                </Card>
              ) : (
                <View style={styles.ctaRow}>
                  <Button
                    title={saving ? 'Guardando…' : 'Guardar'}
                    variant="outline"
                    onPress={handleSaveAll}
                    loading={saving}
                    disabled={filledCount === 0 || saving || submitting}
                    fullWidth={false}
                    style={{ flex: 1, marginRight: spacing.sm }}
                  />
                  <Button
                    title="Enviar Quiniela"
                    onPress={() => setShowConfirmSubmit(true)}
                    disabled={!allFilled || saving || submitting}
                    fullWidth={false}
                    style={{ flex: 2 }}
                  />
                </View>
              )}
              {!allFilled && mode === 'edit' && !isDeadlinePassed && (
                <Text style={styles.hint}>
                  Faltan {matches.length - filledCount} partido{matches.length - filledCount !== 1 ? 's' : ''} para poder enviar
                </Text>
              )}
            </View>
          }
        />
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
              Una vez enviada no podrás cambiar tus predicciones. ¿Estás seguro?
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
              Tu quiniela ha sido registrada exitosamente. ¡Buena suerte!
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnPrimary, { alignSelf: 'center', marginTop: spacing.lg }]}
              onPress={() => { setShowSuccessModal(false); setMode('view'); }}
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
  list: { padding: spacing.md, paddingBottom: spacing.xxl },

  groupHeader: {
    backgroundColor: colors.primaryDark,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: radius.sm,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1.5,
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
  deadlineLabel: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '600',
    marginTop: spacing.xs,
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
  deadlinePassedText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
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

  ctaRow: { flexDirection: 'row', gap: spacing.sm },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
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
