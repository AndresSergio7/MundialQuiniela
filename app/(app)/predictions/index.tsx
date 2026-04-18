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
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import { fetchAllMatches } from '@/services/matches';
import {
  fetchUserPredictions,
  savePredictionsBulk,
  submitQuiniela,
  getSubmissionStatus,
} from '@/services/predictions';
import { PoolSelectorBar } from '@/components/PoolSelectorBar';
import { MatchRow } from '@/components/MatchRow';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius } from '@/components/ui/theme';
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

  // Once a user's submission is marked final, no more edits are
  // ever allowed — even if the deadline hasn't passed.
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
    for (const m of allMatches) {
      scores[m.id] = { home: '', away: '' };
    }
    for (const p of predictions) {
      scores[p.match_id] = {
        home: String(p.home_score),
        away: String(p.away_score),
      };
    }
    setLocalScores(scores);

    const deadlinePast = new Date(activePool.prediction_deadline) <= new Date();
    // Final submissions or a passed deadline → read-only.
    if (sub?.is_final || (sub?.is_valid && !deadlinePast)) {
      setMode('view');
    } else {
      setMode('edit');
    }

    setLoading(false);
  }, [currentPool, user]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPool?.id]);

  function handleScoreChange(matchId: string, side: 'home' | 'away', val: string) {
    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 2);
    setLocalScores((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: cleaned },
    }));
    setError(null);
    setValidationErrors([]);
    setSavedOk(false);
  }

  const filledCount = useMemo(
    () => Object.values(localScores).filter((s) => s.home !== '' && s.away !== '').length,
    [localScores]
  );

  const allFilled = matches.length > 0 && filledCount === matches.length;

  function buildPredictionMap(): PredictionMap {
    const map: PredictionMap = {};
    for (const [matchId, score] of Object.entries(localScores)) {
      if (score.home !== '' && score.away !== '') {
        map[matchId] = {
          home: parseInt(score.home, 10),
          away: parseInt(score.away, 10),
        };
      }
    }
    return map;
  }

  async function handleSaveAll() {
    if (!currentPool || !user) return;
    setError(null);
    setValidationErrors([]);
    setSavedOk(false);

    if (filledCount === 0) {
      setError('Ingresa al menos un resultado antes de guardar.');
      return;
    }

    setSaving(true);
    const result = await savePredictionsBulk(currentPool.id, user.id, buildPredictionMap());
    setSaving(false);

    if (!result.success) {
      setError(result.error ?? 'Failed to save. Try again.');
    } else {
      setSavedOk(true);
    }
  }

  async function doSubmit() {
    if (!currentPool || !user) return;
    setError(null);
    setValidationErrors([]);
    setSavedOk(false);
    setSubmitting(true);

    const saveResult = await savePredictionsBulk(currentPool.id, user.id, buildPredictionMap());
    if (!saveResult.success) {
      setSubmitting(false);
      setShowConfirmSubmit(false);
      setError(saveResult.error ?? 'Failed to save predictions.');
      return;
    }

    const submitResult = await submitQuiniela(currentPool.id, user.id);
    setSubmitting(false);
    setShowConfirmSubmit(false);

    if (submitResult.success) {
      const sub = await getSubmissionStatus(currentPool.id, user.id);
      setSubmission(sub);
      setShowSuccessModal(true);
    } else {
      setValidationErrors(submitResult.errors);
      setError('Tu quiniela tiene errores de validación (ver abajo). Corrígelos y vuelve a enviar.');
    }
  }

  function handleModify() {
    setMode('edit');
    setError(null);
    setValidationErrors([]);
    setSavedOk(false);
  }

  const groupedMatches = useMemo(() => {
    const groups: Record<string, Match[]> = {};
    for (const m of matches) {
      if (!groups[m.group_name]) groups[m.group_name] = [];
      groups[m.group_name].push(m);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title: `Group ${title}`, data }));
  }, [matches]);

  if (!currentPool) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noPool}>Select a pool from Home to enter predictions.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <PoolSelectorBar onPoolChange={(pool) => loadAll(pool)} />

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: spacing.xxl }}
        />
      ) : (
        <SectionList
          sections={groupedMatches}
          keyExtractor={(m) => m.id}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => loadAll()} />
          }
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          renderItem={({ item: match }) => (
            <MatchRow
              match={match}
              homeScore={localScores[match.id]?.home ?? ''}
              awayScore={localScores[match.id]?.away ?? ''}
              locked={isLocked}
              onHomeChange={(v) => handleScoreChange(match.id, 'home', v)}
              onAwayChange={(v) => handleScoreChange(match.id, 'away', v)}
            />
          )}
          ListHeaderComponent={
            <View>
              <View style={styles.statusBar}>
                {mode === 'view' && submission?.is_valid ? (
                  <View style={styles.submittedBadge}>
                    <Text style={styles.submittedBadgeText}>Submitted</Text>
                  </View>
                ) : (
                  <Text style={styles.progressText}>
                    {filledCount} / {matches.length} filled
                  </Text>
                )}
                {isDeadlinePassed && (
                  <Text style={styles.deadlineLabel}>Deadline passed</Text>
                )}
              </View>

              {error && (
                <View style={styles.errorBanner}>
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
                  <Text style={styles.successText}>Saved successfully!</Text>
                </View>
              )}
            </View>
          }
          ListFooterComponent={
            <View style={styles.footer}>
              {isDeadlinePassed ? (
                <Text style={styles.deadlinePassed}>
                  Se cerró el plazo de predicciones. Ya no se aceptan cambios.
                </Text>
              ) : mode === 'view' ? (
                <Card style={styles.submittedCard}>
                  <Text style={styles.submittedCardTitle}>
                    {isFinal ? 'Quiniela enviada y bloqueada' : 'Quiniela válida'}
                  </Text>
                  <Text style={styles.submittedCardSub}>
                    {isFinal
                      ? 'No podrás modificar tus predicciones.'
                      : 'Puedes seguir ajustando hasta el cierre.'}
                  </Text>
                  {!isFinal && (
                    <Button
                      title="Modificar predicciones"
                      variant="outline"
                      onPress={handleModify}
                      style={{ marginTop: spacing.md }}
                    />
                  )}
                </Card>
              ) : (
                <>
                  <Button
                    title={saving ? 'Guardando...' : 'Guardar Predicciones'}
                    variant="outline"
                    onPress={handleSaveAll}
                    loading={saving}
                    disabled={filledCount === 0 || saving || submitting}
                    style={{ marginBottom: spacing.sm }}
                  />
                  <Button
                    title="Enviar Quiniela"
                    onPress={() => setShowConfirmSubmit(true)}
                    disabled={!allFilled || saving || submitting}
                  />
                  {!allFilled && (
                    <Text style={styles.hint}>
                      Faltan {matches.length - filledCount} partido{matches.length - filledCount !== 1 ? 's' : ''} por completar para poder enviar
                    </Text>
                  )}
                </>
              )}
            </View>
          }
        />
      )}

      {/* ── Confirmation modal ── */}
      <Modal visible={showConfirmSubmit} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>¿Enviar quiniela?</Text>
            <Text style={styles.modalBody}>
              ¿Estás seguro de que quieres enviar esta quiniela? Una vez enviada, no podrás cambiar tus predicciones.
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
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Aceptar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Success modal ── */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, { color: colors.success }]}>¡Quiniela enviada!</Text>
            <Text style={styles.modalBody}>
              Tu quiniela ha sido creada exitosamente. Buena suerte.
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnPrimary, { alignSelf: 'center', marginTop: spacing.lg }]}
              onPress={() => { setShowSuccessModal(false); setMode('view'); }}
            >
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  noPool: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressText: { ...typography.label, color: colors.textMuted },
  deadlineLabel: { ...typography.caption, color: colors.error, fontWeight: '600' },
  submittedBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  submittedBadgeText: { ...typography.caption, color: colors.success, fontWeight: '700' },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: { ...typography.caption, color: colors.error },
  successBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  successText: { ...typography.caption, color: colors.success, fontWeight: '600' },
  footer: { marginTop: spacing.lg, paddingBottom: spacing.xxl },
  deadlinePassed: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  submittedCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: colors.success,
  },
  submittedCardTitle: { ...typography.h3, color: colors.success },
  submittedCardSub: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalBody: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  modalBtnOutline: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnPrimary: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
  },
  modalBtnText: {
    ...typography.label,
    fontWeight: '600',
  },
});
