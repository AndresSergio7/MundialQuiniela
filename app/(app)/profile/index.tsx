import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth';
import { Input } from '@/components/ui/Input';
import { colors, spacing, radius, shadows, typography } from '@/components/ui/theme';
import { getMyProfile, updateMyProfile, uploadAvatar } from '@/services/profile.service';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const username = (user?.user_metadata?.username as string | undefined) ?? 'Jugador';
  const email = user?.email ?? '';

  const initials = useMemo(() => {
    const name = fullName.trim() || username;
    return name.slice(0, 1).toUpperCase();
  }, [fullName, username]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    getMyProfile(user.id).then(profile => {
      if (cancelled) return;
      setFullName(profile?.full_name ?? '');
      setAvatarUrl(profile?.avatar_url ?? '');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar el avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setLocalAvatarUri(uri);
    setError(null);
    setSuccess(null);

    if (!user) return;
    setUploadingAvatar(true);
    const { url, error: uploadErr } = await uploadAvatar(user.id, uri);
    setUploadingAvatar(false);

    if (uploadErr || !url) {
      setError(uploadErr ?? 'No se pudo subir el avatar.');
      setLocalAvatarUri(null);
      return;
    }

    setAvatarUrl(url);
    await updateMyProfile(user.id, { avatar_url: url });
    setSuccess('Avatar actualizado.');
  }

  async function handleSaveProfile() {
    if (!user) return;
    setSavingProfile(true);
    setError(null);
    setSuccess(null);

    const result = await updateMyProfile(user.id, {
      full_name: fullName.trim() || null,
    });

    setSavingProfile(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudo guardar el perfil.');
      return;
    }
    setSuccess('Perfil actualizado.');
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login' as any);
  }

  const avatarSource = localAvatarUri ?? (avatarUrl || null);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      {/* Hero */}
      <View style={[styles.hero, { paddingTop: Math.max(insets.top, spacing.md) + spacing.sm }]}>
        <View style={styles.heroGlow} />
        <View style={styles.heroGlow2} />

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.avatarWrap} onPress={handlePickAvatar} activeOpacity={0.85}>
          {uploadingAvatar ? (
            <View style={styles.avatarCircle}>
              <ActivityIndicator color={colors.navy} />
            </View>
          ) : avatarSource ? (
            <Image source={{ uri: avatarSource }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{initials}</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Ionicons name="camera" size={13} color="#fff" />
          </View>
        </TouchableOpacity>

        <Text style={styles.heroUsername}>{username}</Text>
        <Text style={styles.heroEmail}>{email}</Text>
      </View>

      {/* Feedback */}
      {(error || success) && (
        <View style={styles.feedbackWrap}>
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {success && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.successText}>{success}</Text>
            </View>
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <>
          {/* Datos personales */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DATOS PERSONALES</Text>
            <View style={styles.card}>
              <Input
                label="Nombre completo"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Tu nombre"
              />
              <TouchableOpacity
                style={[styles.saveBtn, savingProfile && styles.saveBtnDisabled]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>Guardar cambios</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Cuenta */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CUENTA</Text>
            <View style={styles.card}>
              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconWrap, { backgroundColor: '#EAF6EE' }]}>
                    <Ionicons name="notifications-outline" size={18} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.menuItemTitle}>Notificaciones</Text>
                    <Text style={styles.menuItemSub}>Próximamente</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
              </View>

              <View style={styles.divider} />

              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconWrap, { backgroundColor: '#EAF6EE' }]}>
                    <Ionicons name="mail-outline" size={18} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.menuItemTitle}>Correo</Text>
                    <Text style={styles.menuItemSub}>{email}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Cerrar sesión */}
          <View style={[styles.section, { marginBottom: spacing.xl }]}>
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={18} color={colors.error} />
              <Text style={styles.signOutText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  hero: {
    backgroundColor: '#084D26',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + spacing.md,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(201,168,76,0.10)',
    top: -60,
    right: -50,
  },
  heroGlow2: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -40,
    left: -20,
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarInitial: {
    fontSize: 36,
    color: colors.navy,
    fontFamily: 'BarlowCondensed_900Black',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#084D26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroUsername: {
    fontSize: 26,
    color: '#fff',
    fontFamily: 'BarlowCondensed_800ExtraBold',
    lineHeight: 28,
  },
  heroEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'BarlowCondensed_500Medium',
    marginTop: 2,
  },

  feedbackWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.errorLight,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  errorText: { ...typography.caption, color: colors.error, flex: 1 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successLight,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  successText: { ...typography.caption, color: colors.success, fontWeight: '700' },

  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: 'BarlowCondensed_700Bold',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.sm + 4,
    marginTop: spacing.xs,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontSize: 15,
    color: colors.text,
    fontFamily: 'BarlowCondensed_700Bold',
  },
  menuItemSub: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: 'BarlowCondensed_500Medium',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  signOutText: {
    fontSize: 15,
    color: colors.error,
    fontFamily: 'BarlowCondensed_700Bold',
  },
});
