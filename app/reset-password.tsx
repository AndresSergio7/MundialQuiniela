import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography, radius, shadows } from '@/components/ui/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});

  const refreshSession = useCallback(async () => {
    setChecking(true);
    const { data: { session } } = await supabase.auth.getSession();
    setHasSession(!!session);
    setChecking(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshSession();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setHasSession(!!session);
      });
      return () => subscription.unsubscribe();
    }, [refreshSession]),
  );

  // Web: Supabase a veces aplica el hash (#access_token=…) un tick después del primer getSession.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.location.hash.includes('access_token')) return;
    const t = setTimeout(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setHasSession(true);
      });
    }, 250);
    return () => clearTimeout(t);
  }, []);

  function validate(): boolean {
    const e: typeof fieldErrors = {};
    if (password.length < 6) e.password = 'Mínimo 6 caracteres.';
    if (password !== confirm) e.confirm = 'Las contraseñas no coinciden.';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    setErrorMsg('');
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new AppError('AUTH_UPDATE_PASSWORD_FAILED', error.message);
      router.replace('/(app)');
    } catch (err) {
      setErrorMsg(
        err instanceof AppError ? err.message : 'No se pudo actualizar la contraseña.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <View style={[styles.flex, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!hasSession) {
    return (
      <View style={styles.flex}>
        <View style={styles.hero}>
          <TouchableOpacity style={styles.backRow} onPress={() => router.replace('/(auth)/login')}>
            <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.9)" />
            <Text style={styles.backText}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.formCard}>
          <View style={styles.warnBox}>
            <Ionicons name="link-outline" size={28} color={colors.textMuted} />
            <Text style={styles.warnTitle}>Enlace inválido o caducado</Text>
            <Text style={styles.warnBody}>
              Abre el enlace del correo en este mismo dispositivo o solicita uno nuevo.
            </Text>
            <Button
              title="Solicitar nuevo enlace"
              variant="outline"
              onPress={() => router.replace('/(auth)/forgot-password')}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.ballWrap}>
            <Ionicons name="lock-closed-outline" size={34} color={colors.accentBright} />
          </View>
          <Text style={styles.brand}>Nueva contraseña</Text>
          <Text style={styles.heroSub}>Elige una contraseña segura para tu cuenta.</Text>
        </View>

        <View style={styles.formCard}>
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.errorBannerText}> {errorMsg}</Text>
            </View>
          ) : null}

          <Input
            label="Nueva contraseña"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setErrorMsg('');
            }}
            placeholder="••••••••"
            secureTextEntry
            error={fieldErrors.password}
          />
          <Input
            label="Confirmar contraseña"
            value={confirm}
            onChangeText={(t) => {
              setConfirm(t);
              setErrorMsg('');
            }}
            placeholder="••••••••"
            secureTextEntry
            error={fieldErrors.confirm}
          />

          <Button
            title="Guardar contraseña"
            icon="checkmark-circle-outline"
            onPress={handleSave}
            loading={loading}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.primaryDark },
  centered: { justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1 },

  hero: {
    backgroundColor: colors.primaryDark,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  backText: {
    ...typography.bodyMd,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 2,
  },
  ballWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  brand: { ...typography.h1, color: '#fff', textAlign: 'center' },
  heroSub: {
    ...typography.body,
    color: 'rgba(255,255,255,0.6)',
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  formCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.sm,
    ...shadows.lg,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  errorBannerText: { ...typography.bodyMd, color: colors.error, flex: 1 },

  warnBox: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  warnTitle: { ...typography.h3, color: colors.text, textAlign: 'center', marginTop: spacing.sm },
  warnBody: {
    ...typography.bodyMd,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
});
