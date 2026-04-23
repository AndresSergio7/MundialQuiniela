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
import { AppError } from '@/lib/errors';
import { signUp } from '@/services/auth.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography, radius, shadows } from '@/components/ui/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (username.length < 3) e.username = 'El usuario debe tener al menos 3 caracteres.';
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) e.username = 'Solo letras, números y guiones bajos.';
    if (!email.trim() || !email.includes('@')) e.email = 'Ingresa un email válido.';
    if (password.length < 6) e.password = 'La contraseña debe tener al menos 6 caracteres.';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    setErrorMsg('');
    setSuccessMsg('');
    if (!validate()) return;
    setLoading(true);

    try {
      const session = await signUp(email.trim(), password, {
        username: username.trim(),
        fullName: fullName.trim(),
      });

      if (session) {
        // Auth listener en root layout se encarga de redirigir.
        return;
      }

      setSuccessMsg('Revisa tu email para confirmar tu cuenta y luego inicia sesión.');
    } catch (error) {
      setErrorMsg(error instanceof AppError ? error.message : 'Error al crear la cuenta. Intenta de nuevo.');
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
        {/* Championship header */}
        <View style={styles.hero}>
          <View style={styles.ballWrap}>
            <Text style={styles.ball}>⚽</Text>
          </View>
          <Text style={styles.brand}>Crear Cuenta</Text>
          <Text style={styles.heroSub}>Únete al Mundial 2026</Text>
        </View>

        {/* Form card */}
        <View style={styles.formCard}>
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.errorBannerText}> {errorMsg}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
              <View style={{ flex: 1, marginLeft: spacing.xs }}>
                <Text style={styles.successBannerText}>{successMsg}</Text>
                <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                  <Text style={styles.successLink}>Ir a iniciar sesión →</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <Input
            label="Usuario"
            value={username}
            onChangeText={(t) => { setUsername(t); setErrorMsg(''); }}
            placeholder="el_crack"
            autoCapitalize="none"
            autoCorrect={false}
            error={fieldErrors.username}
          />
          <Input
            label="Nombre completo (opcional)"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Lionel Messi"
          />
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
            title="Crear Cuenta"
            icon="person-add-outline"
            onPress={handleRegister}
            loading={loading}
            style={{ marginTop: spacing.sm }}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>¿Ya tienes cuenta?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => router.back()}
          >
            <Text style={styles.switchText}>
              Iniciar sesión{' '}
              <Text style={styles.switchLink}>aquí →</Text>
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
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  ballWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ball: { fontSize: 40 },
  brand: { ...typography.h1, color: '#fff', textAlign: 'center' },
  heroSub: {
    ...typography.body,
    color: 'rgba(255,255,255,0.6)',
    marginTop: spacing.xs,
  },

  formCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingTop: spacing.xl,
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
    marginBottom: spacing.xs,
  },
  successBannerText: { ...typography.bodyMd, color: colors.success },
  successLink: {
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.xs,
    fontSize: 14,
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typography.caption, color: colors.textLight, marginHorizontal: spacing.sm },

  switchButton: { alignItems: 'center', paddingVertical: spacing.xs, paddingBottom: spacing.xl },
  switchText: { ...typography.body, color: colors.textMuted },
  switchLink: { color: colors.primary, fontWeight: '700' },
});
