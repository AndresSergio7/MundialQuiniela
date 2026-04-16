import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { usePool } from '@/hooks/usePool';
import { usePendingInviteStore } from '@/store/pendingInvite';
import { deletePool, leavePool } from '@/services/pools';
import { joinViaInvite } from '@/services/invites';
import { getSubmissionStatus } from '@/services/predictions';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius } from '@/components/ui/theme';
import type { Pool, Submission } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile, entitlement } = useAuthStore();
  const { pools, loading, fetchPools, setCurrentPool } = usePool();
  const { poolId: pendingPoolId, token: pendingToken, clearPendingInvite } =
    usePendingInviteStore();

  const [submissions, setSubmissions] = useState<Record<string, Submission | null>>({});

  // Delete / leave state
  const [confirmPool, setConfirmPool] = useState<Pool | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // On mount: complete any pending invite from a pre-login invite link click,
  // then refresh the pool list so the new pool appears immediately.
  useEffect(() => {
    async function init() {
      if (user && pendingPoolId && pendingToken) {
        await joinViaInvite(user.id, pendingPoolId, pendingToken);
        clearPendingInvite();
      }
      fetchPools();
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user || !pools.length) return;
    const loadSubs = async () => {
      const map: Record<string, Submission | null> = {};
      for (const pool of pools) {
        map[pool.id] = await getSubmissionStatus(pool.id, user.id);
      }
      setSubmissions(map);
    };
    loadSubs();
  }, [pools, user]);

  // Always route to purchase screen — it handles both unused entitlements and new purchases.
  function openCreateModal() {
    router.push('/(app)/purchase');
  }

  function handleSelectPool(pool: Pool) {
    setCurrentPool(pool);
    router.push('/(app)/predictions');
  }

  function handleTrashPress(pool: Pool) {
    setDeleteError(null);
    setConfirmPool(pool);
  }

  async function handleConfirmDelete() {
    if (!confirmPool || !user) return;
    setDeleting(true);
    setDeleteError(null);

    const isAdmin = confirmPool.admin_id === user.id;
    const { error } = isAdmin
      ? await deletePool(user.id, confirmPool.id)
      : await leavePool(user.id, confirmPool.id);

    setDeleting(false);

    if (error) {
      setDeleteError(error);
      return;
    }

    setConfirmPool(null);
    await fetchPools();
  }

  const deadline = new Date('2026-06-11T18:00:00Z');
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000));
  const hasAccess = entitlement?.has_app_access ?? false;
  const confirmIsAdmin = confirmPool ? confirmPool.admin_id === user?.id : false;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPools} />}
    >
      {/* Banner */}
      <Card style={styles.banner}>
        <Text style={styles.bannerTitle}>FIFA World Cup 2026</Text>
        <Text style={styles.bannerSub}>
          {daysLeft > 0 ? `${daysLeft} days until kickoff` : 'Tournament underway!'}
        </Text>
        {profile && (
          <Text style={styles.bannerUser}>Welcome, {profile.username}!</Text>
        )}
      </Card>

      {/* Access banner */}
      {!hasAccess && (
        <TouchableOpacity style={styles.accessBanner} onPress={() => router.push('/(app)/purchase')}>
          <Text style={styles.accessText}>⚽  Get full access — tap here</Text>
        </TouchableOpacity>
      )}

      {/* My Pools */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Pools</Text>
          <TouchableOpacity onPress={openCreateModal}>
            <Text style={styles.createBtn}>+ Nueva</Text>
          </TouchableOpacity>
        </View>

        {pools.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="trophy-outline" size={48} color={colors.primary} style={{ marginBottom: spacing.md }} />
            <Text style={styles.emptyText}>Sin quinielas aún</Text>
            <Text style={styles.emptySubText}>
              Crea tu propia quiniela o únete a una con un link de invitación.
            </Text>
            <Button
              title="Crear Quiniela"
              onPress={() => router.push('/(app)/purchase')}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        ) : (
          pools.map((pool) => {
            const sub = submissions[pool.id];
            return (
              <TouchableOpacity
                key={pool.id}
                onPress={() => handleSelectPool(pool)}
                activeOpacity={0.85}
              >
                <Card style={styles.poolCard}>
                  <View style={styles.poolRow}>
                    <View style={styles.poolInfo}>
                      <Text style={styles.poolName}>{pool.name}</Text>
                      <Text style={styles.poolMeta}>
                        {pool.admin_id === user?.id ? 'Admin' : 'Miembro'} · Max {pool.max_members}
                      </Text>
                    </View>
                    <View style={styles.poolActions}>
                      <View style={[styles.badge, sub?.is_valid ? styles.badgeGreen : styles.badgeGray]}>
                        <Text style={styles.badgeText}>
                          {sub?.is_valid ? 'Submitted' : sub ? 'Invalid' : 'Pending'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); handleTrashPress(pool); }}
                        style={styles.trashBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {sub && sub.validation_errors?.length > 0 && (
                    <Text style={styles.validationError}>{sub.validation_errors[0]}</Text>
                  )}
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Delete / Leave confirmation modal */}
      <Modal
        visible={confirmPool !== null}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!deleting) setConfirmPool(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmContent}>
            <Ionicons
              name={confirmIsAdmin ? 'trash' : 'exit-outline'}
              size={40}
              color={colors.error}
              style={{ marginBottom: spacing.md }}
            />

            <Text style={styles.confirmTitle}>
              {confirmIsAdmin ? 'Eliminar pool' : 'Salir del pool'}
            </Text>

            <Text style={styles.confirmQuestion}>
              ¿Estás seguro que deseas eliminar{' '}
              <Text style={styles.confirmPoolName}>"{confirmPool?.name}"</Text>?
            </Text>

            <Text style={styles.confirmWarning}>
              {confirmIsAdmin
                ? 'Si lo eliminas, todos los datos serán perdidos para todos los usuarios.'
                : 'Si lo eliminas, todos los datos serán perdidos.'}
            </Text>

            {deleteError && (
              <View style={[styles.errorBanner, { marginTop: spacing.md }]}>
                <Text style={styles.errorText}>{deleteError}</Text>
              </View>
            )}

            {deleting ? (
              <ActivityIndicator color={colors.error} style={{ marginTop: spacing.xl }} />
            ) : (
              <View style={styles.modalButtons}>
                <Button
                  title="Cancelar"
                  variant="outline"
                  onPress={() => { setConfirmPool(null); setDeleteError(null); }}
                  fullWidth={false}
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <Button
                  title={confirmIsAdmin ? 'Eliminar' : 'Salir'}
                  onPress={handleConfirmDelete}
                  fullWidth={false}
                  style={{ flex: 1, backgroundColor: colors.error }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, paddingBottom: spacing.xxl },
  banner: {
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  bannerTitle: { ...typography.h2, color: '#fff', textAlign: 'center' },
  bannerSub: { ...typography.body, color: '#c9d4f5', marginTop: spacing.xs },
  bannerUser: { ...typography.label, color: colors.accent, marginTop: spacing.sm },
  accessBanner: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  accessText: { ...typography.label, color: colors.text, fontWeight: '600' },
  section: { marginTop: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h3, color: colors.text },
  createBtn: { ...typography.label, color: colors.primary, fontWeight: '700' },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { ...typography.h3, color: colors.text },
  emptySubText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  poolCard: { marginBottom: spacing.sm },
  poolRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  poolInfo: { flex: 1 },
  poolName: { ...typography.h3, color: colors.text },
  poolMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  poolActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  badgeGreen: { backgroundColor: '#d1fae5' },
  badgeGray: { backgroundColor: colors.border },
  badgeText: { ...typography.caption, fontWeight: '600', color: colors.text },
  trashBtn: { padding: 4 },
  validationError: { ...typography.caption, color: colors.error, marginTop: spacing.xs },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  confirmContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  confirmTitle: {
    ...typography.h2,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  confirmQuestion: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  confirmPoolName: { fontWeight: '700' },
  confirmWarning: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.sm,
    padding: spacing.sm,
    width: '100%',
  },
  errorText: { color: colors.error, fontSize: 13 },
  modalButtons: { flexDirection: 'row', marginTop: spacing.lg, width: '100%' },
});
