import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { AppError } from '@/lib/errors';
import { signIn } from '@/services/auth.service';
import {
  getBiometricStatus,
  authenticateWithBiometrics,
  saveBiometricCredentials,
  getBiometricCredentials,
  hasBiometricCredentials,
  type BiometricType,
} from '@/lib/biometrics';
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

  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initBiometrics() {
      // Si ya hay sesión activa el route guard navegará a (app);
      // no tiene sentido pedir biometría.
      if (useAuthStore.getState().session) return;

      const { available, type } = await getBiometricStatus();
      if (cancelled || !available) return;

      const hasCreds = await hasBiometricCredentials();
      if (cancelled) return;

      setBiometricType(type);
      setBiometricReady(hasCreds);
      if (hasCreds) triggerBiometricLogin(type);
    }

    initBiometrics();
    return () => { cancelled = true; };
  }, []);

  async function triggerBiometricLogin(type: BiometricType) {
    // Double-check: si hay sesión activa no hacer nada
    if (useAuthStore.getState().session) return;

    setBiometricLoading(true);
    setErrorMsg('');
    try {
      const authenticated = await authenticateWithBiometrics(type);
      if (!authenticated) { setBiometricLoading(false); return; }

      const creds = await getBiometricCredentials();
      if (!creds) { setBiometricLoading(false); return; }

      await signIn(creds.email, creds.password);
    } catch (error) {
      setErrorMsg(error instanceof AppError ? error.message : 'Error al iniciar sesión.');
    } finally {
      setBiometricLoading(false);
    }
  }

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

    try {
      await signIn(email.trim(), password);
      await offerBiometricSetup(email.trim(), password);
    } catch (error) {
      setErrorMsg(error instanceof AppError ? error.message : 'Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function offerBiometricSetup(emailVal: string, passwordVal: string) {
    if (biometricReady) return;
    const { available, type } = await getBiometricStatus();
    if (!available) return;

    const label = type === 'facial' ? 'Face ID' : 'Huella dactilar';
    Alert.alert(
      `Activar ${label}`,
      `¿Quieres usar ${label} para entrar más rápido la próxima vez?`,
      [
        { text: 'Ahora no', style: 'cancel' },
        {
          text: 'Activar',
          onPress: async () => {
            await saveBiometricCredentials(emailVal, passwordVal);
            setBiometricType(type);
            setBiometricReady(true);
          },
        },
      ],
    );
  }

  const biometricIcon = biometricType === 'facial' ? 'scan-outline' : 'finger-print';
  const biometricLabel = biometricType === 'facial' ? 'Face ID' : 'Huella dactilar';

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
          <View style={styles.heroBall3} />

          <View style={styles.heroContent}>
            <View style={styles.logoWrap}>
              <Ionicons name="football" size={48} color={colors.accent} />
            </View>
            <Text style={styles.brand}>Mundial Quiniela</Text>
            <View style={styles.worldCupBadge}>
              <Text style={styles.worldCupText}>CHAMPIONSHIP EDITION 2026</Text>
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>¡Bienvenido de nuevo!</Text>
            <Text style={styles.formSub}>Ingresa tus credenciales para continuar</Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Input
              label="Correo Electrónico"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
              placeholder="nombre@ejemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={fieldErrors.email}
              leftIcon={<Ionicons name="mail-outline" size={20} color={colors.textLight} />}
            />
            <Input
              label="Contraseña"
              value={password}
              onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
              placeholder="••••••••"
              secureTextEntry
              error={fieldErrors.password}
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textLight} />}
            />

            <TouchableOpacity
              style={styles.forgotLinkWrap}
              onPress={() => router.push('/(auth)/forgot-password')}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotLink}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Entrar a la Cancha"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            variant="primary"
            style={styles.loginBtn}
          />

          {biometricReady && biometricType !== 'none' && (
            <TouchableOpacity
              style={styles.biometricBtn}
              onPress={() => triggerBiometricLogin(biometricType)}
              disabled={biometricLoading}
              activeOpacity={0.8}
            >
              <View style={styles.biometricIconWrap}>
                <Ionicons
                  name={biometricIcon}
                  size={28}
                  color={biometricLoading ? colors.textLight : colors.primary}
                />
              </View>
              <Text style={styles.biometricLabel}>
                {biometricLoading ? 'Verificando…' : `Entrar con ${biometricLabel}`}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.footer}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>O TAMBIÉN</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.8}
            >
              <Text style={styles.switchText}>
                ¿No tienes cuenta? <Text style={styles.switchLink}>Regístrate gratis</Text>
              </Text>
            </TouchableOpacity>
          </View>
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
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroContent: { alignItems: 'center', zIndex: 10 },
  heroBall1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.04)', top: -80, right: -60,
  },
  heroBall2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(201,168,76,0.06)', bottom: 20, left: -40,
  },
  heroBall3: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)', top: 40, left: 40,
  },
  logoWrap: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: spacing.md, ...shadows.md,
  },
  brand: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -0.5, textAlign: 'center' },
  worldCupBadge: {
    backgroundColor: 'rgba(201,168,76,0.15)', borderRadius: radius.full, borderWidth: 1,
    borderColor: colors.accent + '60', paddingHorizontal: spacing.md, paddingVertical: 5, marginTop: spacing.sm,
  },
  worldCupText: { fontSize: 10, color: colors.accentBright, letterSpacing: 1.2, fontWeight: '800' },
  formCard: {
    flex: 1, backgroundColor: colors.background, borderTopLeftRadius: radius.xl + 10,
    borderTopRightRadius: radius.xl + 10, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl, marginTop: -30, ...shadows.lg,
  },
  formHeader: { marginBottom: spacing.xl },
  formTitle: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  formSub: { fontSize: 14, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
  inputGroup: { gap: spacing.sm },
  forgotLinkWrap: { alignSelf: 'flex-end', paddingVertical: spacing.xs },
  forgotLink: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  loginBtn: { marginTop: spacing.xl, ...shadows.md },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.errorLight,
    borderWidth: 1, borderColor: colors.error + '40', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  errorBannerText: { fontSize: 13, color: colors.error, fontWeight: '600', flex: 1 },

  biometricBtn: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  biometricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricLabel: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '700',
  },

  footer: { marginTop: spacing.xxl },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  dividerLine: { flex: 1, height: 1.5, backgroundColor: '#E2E8F0' },
  dividerText: { fontSize: 10, fontWeight: '800', color: colors.textLight, marginHorizontal: spacing.md, letterSpacing: 1 },
  switchButton: { alignItems: 'center', paddingVertical: spacing.sm },
  switchText: { fontSize: 15, color: colors.textMuted, fontWeight: '500' },
  switchLink: { color: colors.primary, fontWeight: '800' },
});
