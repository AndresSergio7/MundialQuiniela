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
  const { user, profile } = useAuthStore();
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
    const trimmedName = poolName.trim();

    if (!trimmedName) {
      Alert.alert('Pool name required', 'Please enter a name for your pool.');
      return;
    }

    if (!user) {
      Alert.alert('Sign in required', 'Please sign in again to create a pool.');
      return;
    }

    setCreating(true);

    try {
      const { pool, error } = await createPool(user.id, trimmedName);

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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create pool.';
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
  const daysLeft = Math.max(
    0,
    Math.ceil((deadline.getTime() - now.getTime()) / 86400000)
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPools} />}
    >
      <Card style={styles.banner}>
        <Text style={styles.bannerTitle}>FIFA World Cup 2026</Text>
        <Text style={styles.bannerSub}>
          {daysLeft > 0 ? `${daysLeft} days until kickoff` : 'Tournament has started!'}
        </Text>
        {profile?.full_name ? (
          <Text style={styles.bannerUser}>Welcome, {profile.full_name}</Text>
        ) : null}
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Pools</Text>
        <Button
          title="Create Pool"
          onPress={() => setShowCreateModal(true)}
          fullWidth={false}
        />
      </View>

      {loading ? (
        <Card>
          <Text style={styles.emptyText}>Loading pools...</Text>
        </Card>
      ) : !pools.length ? (
        <Card>
          <Text style={styles.emptyTitle}>No pools yet</Text>
          <Text style={styles.emptyText}>
            Create your first pool and start predicting the World Cup.
          </Text>
        </Card>
      ) : (
        <FlatList
          data={pools}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const submission = submissions[item.id];
            const submitted = Boolean(submission);

            return (
              <TouchableOpacity activeOpacity={0.9} onPress={() => handleSelectPool(item)}>
                <Card style={styles.poolCard}>
                  <View style={styles.poolHeader}>
                    <Text style={styles.poolName}>{item.name}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        submitted ? styles.statusSubmitted : styles.statusPending,
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>
                        {submitted ? 'Submitted' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.poolMeta}>
                    {submitted
                      ? 'Your predictions are already submitted.'
                      : 'You still need to complete your predictions.'}
                  </Text>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCreateModal(false);
          setPoolName('');
        }}
      >
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
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  banner: {
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  bannerTitle: {
    ...typography.h2,
    color: '#fff',
    textAlign: 'center',
  },
  bannerSub: {
    ...typography.body,
    color: '#c9d4f5',
    marginTop: spacing.xs,
  },
  bannerUser: {
    ...typography.label,
    color: colors.accent,
    marginTop: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  listContent: {
    gap: spacing.md,
  },
  poolCard: {
    marginBottom: spacing.md,
  },
  poolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  poolName: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  poolMeta: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  statusSubmitted: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    ...typography.caption,
    color: colors.text,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
});
