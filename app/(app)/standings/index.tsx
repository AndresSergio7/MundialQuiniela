import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { usePoolStore } from '@/store/pool';
import { getStandingsWithAllMembers } from '@/services/standings.service';
import { getPoolMembers, updatePoolNotes, updateMemberPaidStatus } from '@/services/pools.service';
import { syncResults } from '@/services/results.service';
import { fetchPredictionsForMember } from '@/services/predictions.service';
import { fetchAllMatches } from '@/services/matches.service';
import { exportPredictionsPdf } from '@/lib/predictionsPdf';
import { PoolSelectorBar } from '@/components/PoolSelectorBar';
import { StandingRow } from '@/components/StandingRow';
import { colors, spacing, typography, radius, shadows } from '@/components/ui/theme';
import { saveRanks, loadPreviousRanks } from '@/lib/rankHistory';
import type { Standing, Pool, PoolMember } from '@/types';

export default function StandingsScreen() {
  const { user } = useAuthStore();
  const { currentPool } = usePoolStore();
  const [standings, setStandings] = useState<Standing[]>([]);
  const [members, setMembers] = useState<PoolMember[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tournamentStarted, setTournamentStarted] = useState(false);
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [viewingPdfUserId, setViewingPdfUserId] = useState<string | null>(null);
  const [rankChanges, setRankChanges] = useState<Record<string, number>>({});

  const isAdmin = currentPool ? currentPool.admin_id === user?.id : false;

  const loadStandings = useCallback(async (pool?: Pool) => {
    const activePool = pool ?? currentPool;
    if (!activePool) return;
    setLoading(true);
    const [data, poolMembers, allMatches] = await Promise.all([
      getStandingsWithAllMembers(activePool.id),
      getPoolMembers(activePool.id),
      fetchAllMatches(),
    ]);

    // Compute rank changes vs previous snapshot
    const userIds = data.map(s => s.user_id);
    const prevRanks = await loadPreviousRanks(activePool.id, userIds);
    const changes: Record<string, number> = {};
    for (const s of data) {
      if (s.rank != null && prevRanks[s.user_id] != null) {
        changes[s.user_id] = prevRanks[s.user_id] - s.rank; // positive = moved up
      } else {
        changes[s.user_id] = 0;
      }
    }
    setRankChanges(changes);
    await saveRanks(activePool.id, data.filter(s => s.rank != null).map(s => ({ userId: s.user_id, rank: s.rank! })));

    setStandings(data);
    setMembers(poolMembers);
    setMemberCount(poolMembers.length);
    setNotes(activePool.notes ?? '');
    const started = allMatches.some((m) => m.status === 'live' || m.status === 'finished');
    setTournamentStarted(started);
    setLoading(false);
  }, [currentPool]);

  const handleSync = useCallback(async () => {
    if (!currentPool) return;
    setSyncing(true);
    await syncResults(currentPool.id);
    await loadStandings();
    setSyncing(false);
  }, [currentPool, loadStandings]);

  useEffect(() => {
    loadStandings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPool?.id]);

  async function handleSaveNotes() {
    if (!currentPool) return;
    setSavingNotes(true);
    const { error } = await updatePoolNotes(currentPool.id, notes);
    setSavingNotes(false);
    if (error) {
      Alert.alert('Error', 'No se pudieron guardar las notas.');
    } else {
      setEditingNotes(false);
    }
  }

  async function handleTogglePaid(poolMemberId: string, userId: string, isPaid: boolean) {
    if (!currentPool) return;
    const prev = members;
    setMembers((ms) =>
      ms.map((m) => (m.user_id === userId ? { ...m, is_paid: isPaid } : m)),
    );
    const { error } = await updateMemberPaidStatus(currentPool.id, userId, isPaid);
    if (error) {
      setMembers(prev);
      Alert.alert('Error', 'No se pudo actualizar el estado de pago.');
    }
  }

  async function handleViewPdf(standing: Standing) {
    if (!currentPool || !tournamentStarted) return;
    if (viewingPdfUserId) return;
    setViewingPdfUserId(standing.user_id);
    try {
      const [predictions, allMatches] = await Promise.all([
        fetchPredictionsForMember(currentPool.id, standing.user_id),
        fetchAllMatches(),
      ]);
      const matchMap = new Map(allMatches.map((m) => [m.id, m]));
      const rows = predictions
        .filter((p) => matchMap.has(p.match_id))
        .map((p) => ({
          match: matchMap.get(p.match_id)!,
          homeScore: p.home_score,
          awayScore: p.away_score,
        }));
      if (rows.length === 0) {
        Alert.alert('Sin predicciones', 'Este jugador no ha llenado su quiniela.');
        return;
      }
      await exportPredictionsPdf({
        poolName: currentPool.name,
        generatedAt: new Date(),
        userLabel: standing.profile?.username,
        rows,
      });
    } catch {
      Alert.alert('Error', 'No se pudo generar el PDF.');
    } finally {
      setViewingPdfUserId(null);
    }
  }

  if (!currentPool) {
    return (
      <View style={styles.emptyScreen}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="trophy-outline" size={40} color={colors.accent} />
        </View>
        <Text style={styles.emptyTitle}>Sin quiniela activa</Text>
        <Text style={styles.emptySubtitle}>Selecciona una quiniela desde Inicio para ver la tabla.</Text>
      </View>
    );
  }

  const userStanding = standings.find((s) => s.user_id === user?.id);
  const submittedCount = standings.length;
  const submittedPct = memberCount > 0 ? (submittedCount / memberCount) * 100 : 0;

  const memberPaidMap = new Map(members.map((m) => [m.user_id, m]));

  return (
    <View style={styles.screen}>
      <PoolSelectorBar onPoolChange={(pool) => loadStandings(pool)} />

      <FlatList
        data={standings}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => loadStandings()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            {/* TOP 3 PODIUM */}
            {standings.length >= 3 && (
              <View style={styles.podiumWrap}>
                <View style={styles.podiumGlowA} />
                <View style={styles.podiumGlowB} />
                <Text style={styles.podiumEyebrow}>CLASIFICACIÓN</Text>
                <Text style={styles.podiumTitle}>{currentPool.name}</Text>
                <View style={styles.podiumRow}>
                  {/* 2nd */}
                  <View style={[styles.podiumItem]}>
                    <View style={[styles.podiumAvatar, styles.podiumAvatarSilver]}>
                      <Text style={styles.podiumAvatarText}>{(standings[1].profile?.username?.[0] ?? '?').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.podiumUsername} numberOfLines={1}>{standings[1].profile?.username ?? '—'}</Text>
                    <Text style={styles.podiumPts}>{standings[1].total_points} pts</Text>
                    <View style={[styles.podiumPedestal, styles.podiumPedestalSilver]}>
                      <Text style={styles.podiumPedestalNum}>2</Text>
                    </View>
                  </View>
                  {/* 1st */}
                  <View style={[styles.podiumItem]}>
                    <Text style={styles.podiumCrown}>👑</Text>
                    <View style={[styles.podiumAvatar, styles.podiumAvatarGold]}>
                      <Text style={styles.podiumAvatarText}>{(standings[0].profile?.username?.[0] ?? '?').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.podiumUsername} numberOfLines={1}>{standings[0].profile?.username ?? '—'}</Text>
                    <Text style={styles.podiumPts}>{standings[0].total_points} pts</Text>
                    <View style={[styles.podiumPedestal, styles.podiumPedestalGold]}>
                      <Text style={styles.podiumPedestalNum}>1</Text>
                    </View>
                  </View>
                  {/* 3rd */}
                  <View style={[styles.podiumItem]}>
                    <View style={[styles.podiumAvatar, styles.podiumAvatarBronze]}>
                      <Text style={styles.podiumAvatarText}>{(standings[2].profile?.username?.[0] ?? '?').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.podiumUsername} numberOfLines={1}>{standings[2].profile?.username ?? '—'}</Text>
                    <Text style={styles.podiumPts}>{standings[2].total_points} pts</Text>
                    <View style={[styles.podiumPedestal, styles.podiumPedestalBronze]}>
                      <Text style={styles.podiumPedestalNum}>3</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Hero card */}
            <View style={styles.heroWrap}>
              <View style={styles.heroCard}>
                <View style={styles.heroGlowA} />
                <View style={styles.heroGlowB} />
                <View style={styles.heroTopRow}>
                  <View>
                    <Text style={styles.heroEyebrow}>CLASIFICACION GENERAL</Text>
                    <Text style={styles.heroTitle}>Tabla de Posiciones</Text>
                    <Text style={styles.heroSub}>{currentPool.name}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.syncChip, syncing && styles.syncChipActive]}
                    onPress={handleSync}
                    disabled={syncing}
                  >
                    <Ionicons
                      name={syncing ? 'sync' : 'refresh-outline'}
                      size={14}
                      color={colors.accentBright}
                    />
                    <Text style={[styles.syncText, syncing && styles.syncTextActive]}>
                      {syncing ? 'Sync…' : 'Sync'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metricChip}>
                    <Ionicons name="people-outline" size={14} color={colors.accentBright} />
                    <Text style={styles.metricText}>{submittedCount}/{memberCount} enviados</Text>
                  </View>
                  <View style={styles.metricChip}>
                    <Ionicons name="bar-chart-outline" size={14} color={colors.accentBright} />
                    <Text style={styles.metricText}>{Math.round(submittedPct)}% de avance</Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${submittedPct}%` as any }]} />
                </View>
              </View>
            </View>

            {/* My position card */}
            {userStanding && (
              <View style={styles.myCardWrap}>
                <View style={styles.myCard}>
                  <View style={styles.myAura} />
                  <View style={styles.myCardLeft}>
                    <Text style={styles.myCardTag}>MI POSICIÓN</Text>
                    <Text style={styles.myRank}>
                      {userStanding.rank != null ? `#${userStanding.rank}` : '—'}
                    </Text>
                  </View>
                  <View style={styles.myDivider} />
                  <View style={styles.myCardRight}>
                    <Text style={styles.myPoints}>{userStanding.total_points}</Text>
                    <Text style={styles.myPtsLabel}>puntos</Text>
                    <Text style={styles.myMeta}>
                      {userStanding.exact_scores} exactos · {userStanding.correct_results} acertados
                    </Text>
                  </View>
                  <View style={styles.myCardBadge}>
                    <Ionicons name="flash" size={12} color={colors.navy} />
                    <Text style={styles.myCardBadgeText}>Rendimiento</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Notes card */}
            <View style={styles.notesWrap}>
              <View style={styles.notesCard}>
                <View style={styles.notesHeader}>
                  <View style={styles.notesTitleRow}>
                    <Ionicons name="chatbox-ellipses-outline" size={16} color={colors.primary} />
                    <Text style={styles.notesTitle}>Notas del grupo</Text>
                  </View>
                  {isAdmin && !editingNotes && (
                    <TouchableOpacity onPress={() => setEditingNotes(true)} style={styles.editNotesBtn}>
                      <Ionicons name="create-outline" size={15} color={colors.primary} />
                      <Text style={styles.editNotesBtnText}>Editar</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {editingNotes ? (
                  <View>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      multiline
                      placeholder="Escribe aquí las notas para el grupo…"
                      placeholderTextColor={colors.textMuted}
                      style={styles.notesInput}
                    />
                    <View style={styles.notesActions}>
                      <TouchableOpacity
                        style={styles.notesCancelBtn}
                        onPress={() => { setEditingNotes(false); setNotes(currentPool.notes ?? ''); }}
                      >
                        <Text style={styles.notesCancelText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.notesSaveBtn, savingNotes && styles.notesSaveBtnDisabled]}
                        onPress={handleSaveNotes}
                        disabled={savingNotes}
                      >
                        {savingNotes ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.notesSaveText}>Guardar</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.notesBody, !notes && styles.notesBodyEmpty]}>
                    {notes || (isAdmin ? 'Sin notas aún. Toca "Editar" para agregar.' : 'Sin notas del grupo.')}
                  </Text>
                )}
              </View>
            </View>

            {/* PDF hint */}
            {tournamentStarted && (
              <View style={styles.pdfHintBanner}>
                <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                <Text style={styles.pdfHintText}>Toca un participante para ver su quiniela en PDF</Text>
              </View>
            )}

            {loading && (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
            )}
          </View>
        }
        renderItem={({ item }) => {
          const member = memberPaidMap.get(item.user_id);
          const isGenerating = viewingPdfUserId === item.user_id;
          return (
            <View>
              {isGenerating && (
                <View style={styles.pdfLoadingOverlay}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.pdfLoadingText}>Generando PDF…</Text>
                </View>
              )}
              <StandingRow
                standing={item}
                isCurrentUser={item.user_id === user?.id}
                isAdmin={isAdmin}
                isPaid={member?.is_paid ?? false}
                canViewPdf={tournamentStarted}
                rankChange={rankChanges[item.user_id] ?? 0}
                onPress={() => handleViewPdf(item)}
                onTogglePaid={(paid) => handleTogglePaid(member?.id ?? '', item.user_id, paid)}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyList}>
              <View style={styles.emptyListIcon}>
                <Ionicons name="trophy-outline" size={32} color={colors.accent} />
              </View>
              <Text style={styles.emptyListTitle}>Tabla vacía</Text>
              <Text style={styles.emptyListSub}>
                Los participantes aparecerán aquí cuando envíen su quiniela.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  emptyScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.xs },
  emptySubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center' },

  heroWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  heroCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    padding: spacing.md,
    overflow: 'hidden',
    ...shadows.lg,
  },
  heroGlowA: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: radius.full,
    top: -52,
    right: -34,
    backgroundColor: 'rgba(201,168,76,0.22)',
  },
  heroGlowB: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: radius.full,
    bottom: -45,
    left: -18,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroEyebrow: {
    ...typography.tiny,
    color: '#9CC0EE',
    letterSpacing: 1,
    fontWeight: '800',
  },
  heroTitle: {
    marginTop: spacing.xs,
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  heroSub: {
    marginTop: 2,
    ...typography.caption,
    color: 'rgba(255,255,255,0.72)',
  },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.65)',
    backgroundColor: 'rgba(201,168,76,0.18)',
  },
  syncChipActive: {
    backgroundColor: 'rgba(201,168,76,0.28)',
  },
  syncText: { ...typography.tiny, color: colors.accentLight, fontWeight: '700' },
  syncTextActive: { color: '#fff' },
  metricsRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metricChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 1,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.4)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  metricText: {
    ...typography.tiny,
    color: '#F4F7FE',
    fontWeight: '700',
    flexShrink: 1,
  },
  progressTrack: {
    marginTop: spacing.sm,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.accentBright,
    borderRadius: radius.full,
  },

  myCardWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  myCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: radius.lg,
    padding: spacing.md,
    overflow: 'hidden',
    ...shadows.lg,
  },
  myAura: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: radius.full,
    left: -36,
    top: -28,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  myCardLeft: { alignItems: 'center', minWidth: 64 },
  myCardTag: {
    ...typography.tiny,
    color: colors.accentBright,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  myRank: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  myDivider: {
    width: 1,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: spacing.md,
  },
  myCardRight: { flex: 1 },
  myPoints: { fontSize: 28, fontWeight: '800', color: colors.accentBright, lineHeight: 32 },
  myPtsLabel: { ...typography.tiny, color: 'rgba(255,255,255,0.6)', marginBottom: spacing.xs },
  myMeta: { ...typography.caption, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  myCardBadge: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 3,
  },
  myCardBadgeText: {
    ...typography.tiny,
    color: colors.navy,
    fontWeight: '800',
  },

  // Notes
  notesWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  notesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  notesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  editNotesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(10,107,53,0.35)',
    backgroundColor: '#EAF6EE',
  },
  editNotesBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  notesBody: { fontSize: 14, color: colors.text, lineHeight: 20 },
  notesBodyEmpty: { color: colors.textMuted, fontStyle: 'italic' },
  notesInput: {
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: colors.surfaceMuted,
  },
  notesActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  notesCancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesCancelText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  notesSaveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  notesSaveBtnDisabled: { opacity: 0.6 },
  notesSaveText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  pdfHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: '#C5D8F0',
    alignSelf: 'flex-start',
  },
  pdfHintText: { fontSize: 12, color: colors.primary, fontWeight: '600' },

  pdfLoadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pdfLoadingText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },

  list: { paddingBottom: spacing.xxl * 2 },

  emptyList: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyListIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyListTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.xs },
  emptyListSub: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Podium
  podiumWrap: {
    backgroundColor: colors.primaryDark, overflow: 'hidden',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 0,
  },
  podiumGlowA: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(201,168,76,0.12)', top: -60, right: -60,
  },
  podiumGlowB: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 0, left: -40,
  },
  podiumEyebrow: { fontSize: 10, fontWeight: '800', color: colors.accentBright, letterSpacing: 1.5, marginBottom: 2 },
  podiumTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: spacing.lg },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  podiumItem: { alignItems: 'center', flex: 1 },
  podiumCrown: { fontSize: 20, marginBottom: 4 },
  podiumAvatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6, borderWidth: 2,
  },
  podiumAvatarGold: { backgroundColor: colors.accent, borderColor: colors.accentBright },
  podiumAvatarSilver: { backgroundColor: colors.silver, borderColor: '#CBD5E1' },
  podiumAvatarBronze: { backgroundColor: colors.bronze, borderColor: '#D4915A' },
  podiumAvatarText: { fontSize: 22, fontWeight: '900', color: '#fff' },
  podiumUsername: { fontSize: 12, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 2 },
  podiumPts: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
  podiumPedestal: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  podiumPedestalGold: { height: 52, backgroundColor: colors.accent },
  podiumPedestalSilver: { height: 38, backgroundColor: colors.silver },
  podiumPedestalBronze: { height: 28, backgroundColor: colors.bronze },
  podiumPedestalNum: { fontSize: 22, fontWeight: '900', color: '#fff' },
});
