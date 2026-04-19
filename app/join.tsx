import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { usePendingInviteStore } from '@/store/pendingInvite';
import { joinViaInvite } from '@/services/invites';
import { usePool } from '@/hooks/usePool';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography, radius, shadows } from '@/components/ui/theme';

type JoinStatus = 'loading' | 'joining' | 'success' | 'error' | 'auth_needed';

export default function JoinScreen() {
  const params = useLocalSearchParams<{ pool?: string; token?: string }>();
  const poolId = params.pool;
  const token = params.token;
  const router = useRouter();
  const { user } = useAuthStore();
  const { setPendingInvite } = usePendingInviteStore();
  const { fetchPools } = usePool();

  const [status, setStatus] = useState<JoinStatus>('loading');
  const [message, setMessage] = useState('');
  const [poolName, setPoolName] = useState<string | null>(null);

  useEffect(() => {
    if (!poolId || !token) {
      setStatus('error');
      setMessage('Este link de invitación no tiene los parámetros requeridos.');
      return;
    }

    if (user) {
      attemptJoin(user.id, poolId, token);
    } else {
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
      setTimeout(() => router.replace('/(app)'), 1400);
    } else {
      setStatus('error');
      const friendly: Record<string, string> = {
        'Pool is full.': 'Esta quiniela ya alcanzó su límite de participantes.',
        'Already a member of this pool.': 'Ya eres miembro de esta quiniela.',
        'Pool is not active or does not exist.': 'Esta quiniela ya no acepta nuevos miembros.',
        'Invalid invite token.': 'Este link es inválido o ha sido cambiado.',
        'Pool not found.': 'Esta quiniela ya no existe.',
      };
      setMessage(friendly[error ?? ''] ?? error ?? 'No se pudo unir a la quiniela. Intenta de nuevo.');
    }
  }

  if (!poolId || !token) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <View style={[styles.iconCircle, styles.iconCircleError]}>
            <Ionicons name="alert-circle-outline" size={36} color={colors.error} />
          </View>
          <Text style={styles.title}>Link Inválido</Text>
          <Text style={styles.subtitle}>
            Este link de invitación no tiene la información necesaria.
          </Text>
          <Button
            title="Ir al inicio"
            onPress={() => router.replace(user ? '/(app)' : '/(auth)/login')}
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </View>
    );
  }

  if (status === 'loading' || status === 'joining') {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <View style={[styles.iconCircle, styles.iconCirclePrimary]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={styles.title}>
            {status === 'joining' ? 'Uniéndote…' : 'Cargando…'}
          </Text>
          <Text style={styles.subtitle}>
            {status === 'joining'
              ? 'Procesando tu invitación al mundial 2026'
              : 'Verificando link de invitación'}
          </Text>
        </View>
      </View>
    );
  }

  if (status === 'success') {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <View style={[styles.iconCircle, styles.iconCircleSuccess]}>
            <Ionicons name="trophy" size={36} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.success }]}>¡Ya estás dentro!</Text>
          <Text style={styles.subtitle}>
            {poolName ? `Bienvenido a "${poolName}".` : 'Te uniste a la quiniela con éxito.'}
          </Text>
          <View style={styles.redirectHint}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.redirectText}>Redirigiendo a tu quiniela…</Text>
          </View>
        </View>
      </View>
    );
  }

  if (status === 'auth_needed') {
    return (
      <View style={styles.screen}>
        {/* Dark hero */}
        <View style={styles.hero}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(201,168,76,0.18)' }]}>
            <Ionicons name="trophy" size={36} color={colors.accentBright} />
          </View>
          <Text style={styles.heroTitle}>¡Estás Invitado!</Text>
          <Text style={styles.heroSubtitle}>
            Crea una cuenta o inicia sesión para unirte a la quiniela del Mundial 2026.
          </Text>
        </View>

        <View style={styles.authButtons}>
          <Button
            title="Crear Cuenta"
            icon="person-add-outline"
            onPress={() => router.push('/(auth)/register')}
          />
          <Button
            title="Iniciar Sesión"
            variant="outline"
            icon="log-in-outline"
            onPress={() => router.push('/(auth)/login')}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </View>
    );
  }

  // error state
  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, styles.iconCircleError]}>
          <Ionicons name="close-circle-outline" size={36} color={colors.error} />
        </View>
        <Text style={[styles.title, { color: colors.error }]}>No se pudo unir</Text>
        <Text style={styles.errorMessage}>{message}</Text>
        {user ? (
          <Button
            title="Ir al inicio"
            onPress={() => router.replace('/(app)')}
            style={{ marginTop: spacing.xl }}
          />
        ) : (
          <>
            <Button
              title="Crear Cuenta"
              onPress={() => router.push('/(auth)/register')}
              style={{ marginTop: spacing.xl }}
            />
            <Button
              title="Iniciar Sesión"
              variant="outline"
              onPress={() => router.push('/(auth)/login')}
              style={{ marginTop: spacing.sm }}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  hero: {
    backgroundColor: colors.primaryDark,
    padding: spacing.xxl,
    paddingTop: spacing.xxxl,
    alignItems: 'center',
  },
  heroTitle: { ...typography.h1, color: '#fff', textAlign: 'center', marginTop: spacing.md },
  heroSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  authButtons: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconCirclePrimary: { backgroundColor: colors.successLight },
  iconCircleSuccess: { backgroundColor: colors.accentLight },
  iconCircleError: { backgroundColor: colors.errorLight },
  title: {
    ...typography.h2,
    color: colors.text,
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
  redirectHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  redirectText: { ...typography.caption, color: colors.textMuted },
});
