import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { usePendingInviteStore } from '@/store/pendingInvite';
import { joinViaInvite } from '@/services/invites';
import { usePool } from '@/hooks/usePool';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius } from '@/components/ui/theme';

type JoinStatus = 'loading' | 'joining' | 'success' | 'error' | 'auth_needed';

export default function JoinScreen() {
  const params = useLocalSearchParams<{ pool?: string; token?: string }>();
  const poolId = params.pool;
  const token = params.token;
  const router = useRouter();
  const { user } = useAuthStore();
  const { setPendingInvite } = usePendingInviteStore();
  const { fetchPools, setCurrentPool } = usePool();

  const [status, setStatus] = useState<JoinStatus>('loading');
  const [message, setMessage] = useState('');
  const [poolName, setPoolName] = useState<string | null>(null);

  useEffect(() => {
    if (!poolId || !token) {
      setStatus('error');
      setMessage('This invite link is missing required parameters.');
      return;
    }

    if (user) {
      attemptJoin(user.id, poolId, token);
    } else {
      // Store for after auth; show auth options
      setPendingInvite(poolId, token);
      setStatus('auth_needed');
    }
  }, []);

  async function attemptJoin(userId: string, pid: string, tk: string) {
    setStatus('joining');
    const { success, error } = await joinViaInvite(userId, pid, tk);

    if (success) {
      await fetchPools();
      setStatus('success');
      setTimeout(() => router.replace('/(app)'), 1200);
    } else {
      setStatus('error');
      // Friendly error messages
      const friendly: Record<string, string> = {
        'Pool is full.': 'This pool has reached its member limit.',
        'Already a member of this pool.': "You're already a member of this pool.",
        'Pool is not active or does not exist.': 'This pool is no longer accepting members.',
        'Invalid invite token.': 'This invite link is invalid or has been changed.',
        'Pool not found.': 'This pool no longer exists.',
      };
      setMessage(friendly[error ?? ''] ?? error ?? 'Could not join pool. Please try again.');
    }
  }

  if (!poolId || !token) {
    return (
      <View style={styles.centered}>
        <Card style={styles.card}>
          <Text style={styles.title}>Invalid Link</Text>
          <Text style={styles.subtitle}>
            This invite link is missing required information.
          </Text>
          <Button
            title="Go to Home"
            onPress={() => router.replace(user ? '/(app)' : '/(auth)/login')}
            style={{ marginTop: spacing.lg }}
          />
        </Card>
      </View>
    );
  }

  if (status === 'loading' || status === 'joining') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.hint}>
          {status === 'joining' ? 'Joining pool…' : 'Loading…'}
        </Text>
      </View>
    );
  }

  if (status === 'success') {
    return (
      <View style={styles.centered}>
        <Card style={styles.successCard}>
          <Text style={styles.successTitle}>You're in!</Text>
          <Text style={styles.subtitle}>
            {poolName ? `Welcome to "${poolName}".` : 'You joined the pool successfully.'}
          </Text>
          <Text style={styles.hint}>Redirecting to your pool…</Text>
        </Card>
      </View>
    );
  }

  if (status === 'auth_needed') {
    return (
      <View style={styles.screen}>
        <View style={styles.centered}>
          <Card style={styles.card}>
            <Text style={styles.title}>You're Invited!</Text>
            <Text style={styles.subtitle}>
              Create an account or sign in to join this World Cup 2026 pool.
            </Text>
            <Button
              title="Create Account"
              onPress={() => router.push('/(auth)/register')}
              style={{ marginTop: spacing.lg }}
            />
            <Button
              title="Sign In"
              variant="outline"
              onPress={() => router.push('/(auth)/login')}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        </View>
      </View>
    );
  }

  // error state
  return (
    <View style={styles.centered}>
      <Card style={styles.card}>
        <Text style={styles.errorTitle}>Couldn't Join</Text>
        <Text style={styles.errorMessage}>{message}</Text>
        {user ? (
          <Button
            title="Go to Home"
            onPress={() => router.replace('/(app)')}
            style={{ marginTop: spacing.lg }}
          />
        ) : (
          <>
            <Button
              title="Create Account"
              onPress={() => router.push('/(auth)/register')}
              style={{ marginTop: spacing.lg }}
            />
            <Button
              title="Sign In"
              variant="outline"
              onPress={() => router.push('/(auth)/login')}
              style={{ marginTop: spacing.sm }}
            />
          </>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  successCard: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: colors.success,
  },
  title: {
    ...typography.h2,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  successTitle: {
    ...typography.h2,
    color: colors.success,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
