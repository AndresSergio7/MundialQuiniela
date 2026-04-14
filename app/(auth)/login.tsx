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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function validate(): boolean {
    const e: typeof fieldErrors = {};
    if (!email.trim() || !email.includes('@')) e.email = 'Enter a valid email.';
    if (password.length < 6) e.password = 'Password must be at least 6 characters.';
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
      // Navigate directly — don't rely solely on auth state change
      router.replace('/(app)');
    } else {
      setErrorMsg('Login failed. Please try again.');
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
        <View style={styles.header}>
          <Text style={styles.emoji}>⚽</Text>
          <Text style={styles.title}>Mundial Quiniela</Text>
          <Text style={styles.subtitle}>FIFA World Cup 2026</Text>
        </View>

        <View style={styles.form}>
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          ) : null}

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
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
          />

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.switchText}>
              Don't have an account?{' '}
              <Text style={styles.switchLink}>Create one</Text>
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
    marginBottom: spacing.sm,
  },
  errorBannerText: { color: colors.error, fontSize: 14 },
  switchButton: { alignItems: 'center', marginTop: spacing.md },
  switchText: { ...typography.body, color: colors.textMuted },
  switchLink: { color: colors.primary, fontWeight: '600' },
});
