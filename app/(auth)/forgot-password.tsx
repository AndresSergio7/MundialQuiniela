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
import { getPasswordRecoveryRedirectUrl } from '@/lib/authRedirect';
import { AppError } from '@/lib/errors';
import { requestPasswordReset } from '@/services/auth.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography, radius, shadows } from '@/components/ui/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sent, setSent] = useState(false);
  const [fieldError, setFieldError] = useState('');

  async function handleSubmit() {
    setErrorMsg('');
    setFieldError('');
    if (!email.trim() || !email.includes('@')) {
      setFieldError('Ingresa un email válido.');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = getPasswordRecoveryRedirectUrl();
      if (__DEV__) {
        // Copia esta URL en Supabase → Authentication → URL configuration → Redirect URLs
        console.info('[auth] recovery redirectTo:', redirectTo);
      }
      await requestPasswordReset(email.trim(), redirectTo);
      setSent(true);
    } catch (error) {
      setErrorMsg(
        error instanceof AppError ? error.message : 'No se pudo enviar el correo. Intenta de nuevo.',
      );
    } finally {
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
        <View style={styles.hero}>
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.9)" />
            <Text style={styles.backText}>Volver</Text>
          </TouchableOpacity>
          <View style={styles.ballWrap}>
            <Ionicons name="key-outline" size={36} color={colors.accentBright} />
          </View>
          <Text style={styles.brand}>Recuperar contraseña</Text>
          <Text style={styles.heroSub}>
            Te enviaremos un enlace para elegir una contraseña nueva.
          </Text>
        </View>

        <View style={styles.formCard}>
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.errorBannerText}> {errorMsg}</Text>
            </View>
          ) : null}

          {sent ? (
            <View style={styles.successBanner}>
              <Ionicons name="mail-outline" size={20} color={colors.success} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.successTitle}>Revisa tu correo</Text>
                <Text style={styles.successBody}>
                  Si existe una cuenta con ese email, recibirás un enlace para restablecer la contraseña.
                </Text>
                <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                  <Text style={styles.successLink}>Volver al inicio de sesión →</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Input
                label="Email"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setErrorMsg('');
                  setFieldError('');
                }}
                placeholder="tu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={fieldError}
              />
              <Button
                title="Enviar enlace"
                icon="send-outline"
                onPress={handleSubmit}
                loading={loading}
                style={{ marginTop: spacing.sm }}
              />
            </>
          )}
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
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

  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  successTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.xs },
  successBody: { ...typography.bodyMd, color: colors.textMuted },
  successLink: {
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.md,
    fontSize: 15,
  },
});
