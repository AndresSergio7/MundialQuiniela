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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroBall1} />
          <View style={styles.heroBall2} />
          
          <View style={styles.heroContent}>
            <TouchableOpacity 
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.logoWrap}>
              <Ionicons name="key" size={40} color={colors.accent} />
            </View>
            <Text style={styles.brand}>Recuperar</Text>
            <Text style={styles.heroSub}>Te ayudamos a volver al juego</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          ) : null}

          {sent ? (
            <View style={styles.successCard}>
              <View style={styles.successIconWrap}>
                <Ionicons name="mail-unread" size={48} color={colors.success} />
              </View>
              <Text style={styles.successTitle}>¡Email Enviado!</Text>
              <Text style={styles.successBody}>
                Hemos enviado las instrucciones para restablecer tu contraseña a <Text style={styles.boldEmail}>{email}</Text>.
              </Text>
              <View style={styles.successFooter}>
                <Text style={styles.hintText}>¿No recibiste nada? Revisa tu carpeta de spam.</Text>
                <Button
                  title="Volver al Login"
                  onPress={() => router.replace('/(auth)/login')}
                  variant="primary"
                  style={styles.backLoginBtn}
                />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>¿Olvidaste tu clave?</Text>
                <Text style={styles.formSub}>
                  Ingresa tu correo y te enviaremos un enlace para recuperarla.
                </Text>
              </View>

              <Input
                label="Tu Correo Electrónico"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setErrorMsg('');
                  setFieldError('');
                }}
                placeholder="nombre@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={fieldError}
                leftIcon={<Ionicons name="mail-outline" size={20} color={colors.textLight} />}
              />

              <Button
                title="Enviar Instrucciones"
                onPress={handleSubmit}
                loading={loading}
                size="lg"
                variant="primary"
                style={styles.submitBtn}
                icon="send-outline"
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
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 10,
    width: '100%',
  },
  backBtn: {
    position: 'absolute',
    top: -20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBall1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -30,
    right: -20,
  },
  heroBall2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(201,168,76,0.06)',
    bottom: -10,
    left: 20,
  },
  logoWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: spacing.sm,
  },
  brand: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    fontWeight: '500',
  },

  formCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl + 10,
    borderTopRightRadius: radius.xl + 10,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    marginTop: -20,
    ...shadows.lg,
  },
  formHeader: {
    marginBottom: spacing.xl,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  formSub: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },

  submitBtn: {
    marginTop: spacing.xl,
    ...shadows.md,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error + '40',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorBannerText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
    flex: 1,
  },

  successCard: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  successIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.success,
    marginBottom: spacing.sm,
  },
  successBody: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },
  boldEmail: {
    color: colors.text,
    fontWeight: '700',
  },
  successFooter: {
    marginTop: spacing.xxl,
    width: '100%',
    alignItems: 'center',
  },
  hintText: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  backLoginBtn: {
    width: '100%',
  },
});
