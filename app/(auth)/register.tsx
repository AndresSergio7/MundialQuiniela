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
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography } from '@/components/ui/theme';

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
    if (username.length < 3) e.username = 'Username must be at least 3 characters.';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) e.username = 'Only letters, numbers, and underscores.';
    if (!email.trim() || !email.includes('@')) e.email = 'Enter a valid email.';
    if (password.length < 6) e.password = 'Password must be at least 6 characters.';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    setErrorMsg('');
    setSuccessMsg('');
    if (!validate()) return;
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { username: username.trim(), full_name: fullName.trim() },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is disabled in Supabase, session is returned immediately
    if (data.session) {
      router.replace('/(app)');
      return;
    }

    // Email confirmation required
    setSuccessMsg('Check your email for a confirmation link, then sign in.');
    setLoading(false);
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
        <View style={styles.header}>
          <Text style={styles.emoji}>⚽</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the World Cup 2026 pool</Text>
        </View>

        <View style={styles.form}>
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>{successMsg}</Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.successLink}>Go to Sign In →</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Input
            label="Username"
            value={username}
            onChangeText={(t) => { setUsername(t); setErrorMsg(''); }}
            placeholder="el_crack"
            autoCapitalize="none"
            autoCorrect={false}
            error={fieldErrors.username}
          />
          <Input
            label="Full Name (optional)"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Lionel Messi"
          />
          <Input
            label="Email"
            value={email}
            onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={fieldErrors.email}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
            placeholder="••••••••"
            secureTextEntry
            error={fieldErrors.password}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
          />

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => router.back()}
          >
            <Text style={styles.switchText}>
              Already have an account?{' '}
              <Text style={styles.switchLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: spacing.xxl },
  emoji: { fontSize: 64, marginBottom: spacing.md },
  title: { ...typography.h1, color: colors.primary },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  form: { gap: spacing.sm },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 8,
    padding: spacing.md,
  },
  errorBannerText: { color: colors.error, fontSize: 14 },
  successBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 8,
    padding: spacing.md,
  },
  successBannerText: { color: colors.success, fontSize: 14 },
  successLink: {
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
    fontSize: 14,
  },
  switchButton: { alignItems: 'center', marginTop: spacing.md },
  switchText: { ...typography.body, color: colors.textMuted },
  switchLink: { color: colors.primary, fontWeight: '600' },
});
