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

      if (session) return;
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
              <Ionicons name="person-add" size={40} color={colors.accent} />
            </View>
            <Text style={styles.brand}>Únete a la Jugada</Text>
            <Text style={styles.heroSub}>Crea tu cuenta y empieza a ganar</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View style={styles.successBanner}>
              <Ionicons name="mail-unread" size={24} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.successBannerTitle}>¡Casi listo!</Text>
                <Text style={styles.successBannerText}>{successMsg}</Text>
                <TouchableOpacity 
                  style={styles.successCta}
                  onPress={() => router.replace('/(auth)/login')}
                >
                  <Text style={styles.successCtaText}>Ir al Login →</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Input
                  label="Nombre de Usuario"
                  value={username}
                  onChangeText={(t) => { setUsername(t); setErrorMsg(''); }}
                  placeholder="ej. el_crack_10"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={fieldErrors.username}
                  leftIcon={<Ionicons name="at-outline" size={20} color={colors.textLight} />}
                />
                <Input
                  label="Nombre Completo"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Tu nombre y apellido"
                  leftIcon={<Ionicons name="person-outline" size={20} color={colors.textLight} />}
                />
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
                  placeholder="Mínimo 6 caracteres"
                  secureTextEntry
                  error={fieldErrors.password}
                  leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textLight} />}
                />
              </View>

              <Button
                title="Crear mi Perfil"
                onPress={handleRegister}
                loading={loading}
                size="lg"
                variant="primary"
                style={styles.registerBtn}
              />

              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.switchButton}
                  onPress={() => router.back()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.switchText}>
                    ¿Ya tienes cuenta? <Text style={styles.switchLink}>Inicia sesión</Text>
                  </Text>
                </TouchableOpacity>
              </View>
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
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroContent: { alignItems: 'center', zIndex: 10, width: '100%' },
  backBtn: {
    position: 'absolute', top: -20, left: 20, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  heroBall1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.04)', top: -40, right: -30,
  },
  heroBall2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(201,168,76,0.06)', bottom: -20, left: -20,
  },
  logoWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: spacing.sm,
  },
  brand: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: '500' },
  formCard: {
    flex: 1, backgroundColor: colors.background, borderTopLeftRadius: radius.xl + 10,
    borderTopRightRadius: radius.xl + 10, paddingHorizontal: spacing.xl, paddingTop: spacing.xl,
    paddingBottom: spacing.xxl, marginTop: -20, ...shadows.lg,
  },
  inputGroup: { gap: spacing.sm },
  registerBtn: { marginTop: spacing.xl, ...shadows.md },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.errorLight,
    borderWidth: 1, borderColor: colors.error + '40', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  errorBannerText: { fontSize: 13, color: colors.error, fontWeight: '600', flex: 1 },
  successBanner: {
    backgroundColor: colors.successLight, borderWidth: 1, borderColor: colors.success + '40',
    borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.md, marginTop: spacing.md,
  },
  successBannerTitle: { fontSize: 18, fontWeight: '800', color: colors.success },
  successBannerText: { fontSize: 14, color: colors.text, textAlign: 'center', lineHeight: 20 },
  successCta: {
    backgroundColor: colors.success, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, marginTop: spacing.sm,
  },
  successCtaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  footer: { marginTop: spacing.xl },
  switchButton: { alignItems: 'center', paddingVertical: spacing.sm },
  switchText: { fontSize: 15, color: colors.textMuted, fontWeight: '500' },
  switchLink: { color: colors.primary, fontWeight: '800' },
});
