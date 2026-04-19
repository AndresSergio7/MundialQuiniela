import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography, radius, shadows } from '@/components/ui/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function validate(): boolean {
    const e: typeof fieldErrors = {};
    if (!email.trim() || !email.includes('@')) e.email = 'Ingresa un email válido.';
    if (password.length < 6) e.password = 'La contraseña debe tener al menos 6 caracteres.';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    setErrorMsg('');
    if (!validate()) return;
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.replace('/(app)');
    } else {
      setErrorMsg('Error al iniciar sesión. Intenta de nuevo.');
      setLoading(false);
    }
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
        {/* Championship header */}
        <View style={styles.hero}>
          <View style={styles.ballWrap}>
            <Text style={styles.ball}>⚽</Text>
          </View>
          <Text style={styles.brand}>Mundial Quiniela</Text>
          <View style={styles.worldCupBadge}>
            <Text style={styles.worldCupText}>FIFA WORLD CUP 2026</Text>
          </View>
        </View>

        {/* Form card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Iniciar Sesión</Text>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.errorBannerText}> {errorMsg}</Text>
            </View>
          ) : null}

          <Input
            label="Email"
            value={email}
            onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={fieldErrors.email}
          />
          <Input
            label="Contraseña"
            value={password}
            onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
            placeholder="••••••••"
            secureTextEntry
            error={fieldErrors.password}
          />

          <Button
            title="Iniciar Sesión"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: spacing.sm }}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>¿Primera vez?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.switchText}>
              Crear cuenta{' '}
              <Text style={styles.switchLink}>gratis →</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.primaryDark },
  container: { flexGrow: 1 },

  hero: {
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  ballWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ball: { fontSize: 44 },
  brand: { ...typography.h1, color: '#fff', textAlign: 'center' },
  worldCupBadge: {
    backgroundColor: 'rgba(201,168,76,0.2)',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  worldCupText: {
    ...typography.tiny,
    color: colors.accentBright,
    letterSpacing: 1.5,
    fontWeight: '700',
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
  formTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  errorBannerText: { ...typography.bodyMd, color: colors.error },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typography.caption, color: colors.textLight, marginHorizontal: spacing.sm },

  switchButton: { alignItems: 'center', paddingVertical: spacing.xs },
  switchText: { ...typography.body, color: colors.textMuted },
  switchLink: { color: colors.primary, fontWeight: '700' },
});
