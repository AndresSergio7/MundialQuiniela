import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { usePool } from '@/hooks/usePool';
import { createPool } from '@/services/pools';
import { getSubmissionStatus } from '@/services/predictions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius } from '@/components/ui/theme';
import type { Pool, Submission } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile, entitlement } = useAuthStore();
  const { pools, loading, fetchPools, setCurrentPool } = usePool();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [poolName, setPoolName] = useState('');
  const [creating, setCreating] = useState(false);
  const [submissions, setSubmissions] = useState<Record<string, Submission | null>>({});

  useEffect(() => {
    fetchPools();
  }, []);

  useEffect(() => {
    const loadSubmissions = async () => {
      if (!user || !pools.length) return;
      const map: Record<string, Submission | null> = {};
      for (const pool of pools) {
        map[pool.id] = await getSubmissionStatus(pool.id, user.id);
      }
      setSubmissions(map);
    };
    loadSubmissions();
  }, [pools, user]);

  async function handleCreatePool() {
    if (!poolName.trim()) return;
    if (!user) return;

    if (!entitlement?.has_app_access) {
      Alert.alert('Purchase Required', 'Buy app access to create a pool.', [
        { text: 'Cancel' },
        { text: 'Purchase', onPress: () => router.push('/(app)/purchase') },
      ]);
      return;
    }

    setCreating(true);
    const { pool, error } = await createPool(user.id, poolName.trim());
    setCreating(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    setShowCreateModal(false);
    setPoolName('');
    await fetchPools();

    if (pool) {
      setCurrentPool(pool);
      router.push('/(app)/predictions');
    }
  }

  function handleSelectPool(pool: Pool) {
    setCurrentPool(pool);
    router.push('/(app)/predictions');
  }

  const deadline = new Date('2026-06-11T18:00:00Z');
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86400000));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPools} />}
    >
      {/* Header Banner */}
      <Card style={styles.banner}>
        <Text style={styles.bannerTitle}>FIFA World Cup 2026</Text>
        <Text style={styles.bannerSub}>
          {daysLeft > 0
            ? `${daysLeft} days until kickoff`
            : 'Tournament has started!'}
        </Text>
        {profile && (
          <Text style={styles.bannerUser}>Welcome, {profile.username}!</Text>
        )}
      </Card>

      {/* Access Status */}
      {!entitlement?.has_app_access && (
        <TouchableOpacity
          style={styles.accessBanner}
          onPress={() => router.push('/(app)/purchase')}
        >
          <Text style={styles.accessText}>
            Unlock full access for $5 — Tap to purchase
          </Text>
        </TouchableOpacity>
      )}

      {/* My Pools */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Pools</Text>
          <TouchableOpacity onPress={() => setShowCreateModal(true)}>
            <Text style={styles.createBtn}>+ New Pool</Text>
          </TouchableOpacity>
        </View>

        {pools.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No pools yet.</Text>
            <Text style={styles.emptySubText}>
              Create a pool or join one via an invite link.
            </Text>
            <Button
              title="Create Pool"
              onPress={() => setShowCreateModal(true)}
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
                        Max {pool.max_members} members
                      </Text>
                    </View>
                    <View style={[styles.badge, sub?.is_valid ? styles.badgeGreen : styles.badgeGray]}>
                      <Text style={styles.badgeText}>
                        {sub?.is_valid ? 'Submitted' : sub ? 'Invalid' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                  {sub && sub.validation_errors?.length > 0 && (
                    <Text style={styles.validationError}>
                      {sub.validation_errors[0]}
                    </Text>
                  )}
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Create Pool Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Pool</Text>
            <Input
              label="Pool Name"
              value={poolName}
              onChangeText={setPoolName}
              placeholder="Mi Quiniela 2026"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setShowCreateModal(false);
                  setPoolName('');
                }}
                fullWidth={false}
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title="Create"
                onPress={handleCreatePool}
                loading={creating}
                fullWidth={false}
                style={{ flex: 1 }}
              />
            </View>
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
  emptySubText: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  poolCard: { marginBottom: spacing.sm },
  poolRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  poolInfo: { flex: 1 },
  poolName: { ...typography.h3, color: colors.text },
  poolMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  badgeGreen: { backgroundColor: '#d1fae5' },
  badgeGray: { backgroundColor: colors.border },
  badgeText: { ...typography.caption, fontWeight: '600', color: colors.text },
  validationError: { ...typography.caption, color: colors.error, marginTop: spacing.xs },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.lg },
  modalButtons: { flexDirection: 'row', marginTop: spacing.sm },
});
