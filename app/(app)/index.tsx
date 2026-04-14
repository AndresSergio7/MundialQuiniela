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
    const trimmedName = poolName.trim();

    if (!trimmedName) {
      Alert.alert('Pool name required', 'Please enter a name for your pool.');
      return;
    }

    if (!user) {
      Alert.alert('Sign in required', 'Please sign in again to create a pool.');
      return;
    }

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
    try {
      const { pool, error } = await createPool(user.id, trimmedName);

    setShowCreateModal(false);
    setPoolName('');
    await fetchPools();
      if (error) {
        Alert.alert('Error', error);
        return;
      }

    if (pool) {
      setCurrentPool(pool);
      router.push('/(app)/predictions');
      setShowCreateModal(false);
      setPoolName('');
      await fetchPools();

      if (pool) {
        setCurrentPool(pool);
        router.push('/(app)/predictions');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create pool.';
      Alert.alert('Error', message);
    } finally {
      setCreating(false);
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
@@ -179,50 +195,51 @@ export default function HomeScreen() {
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
                disabled={!poolName.trim()}
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
