import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, radius, shadows } from '@/components/ui/theme';
import {
  getMyProfile,
  listMyPaymentMethods,
  removePaymentMethod,
  saveMyPaymentMethod,
  setDefaultPaymentMethod,
  updateMyProfile,
} from '@/services/profile.service';
import type { UserPaymentMethod } from '@/types';

const BRANDS = ['visa', 'mastercard', 'amex'];

export default function ProfileScreen() {
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingMethod, setSavingMethod] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [cardBrand, setCardBrand] = useState('visa');
  const [cardLast4, setCardLast4] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [holderName, setHolderName] = useState('');
  const [markDefault, setMarkDefault] = useState(true);

  const [methods, setMethods] = useState<UserPaymentMethod[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const username = (user?.user_metadata?.username as string | undefined) ?? 'Jugador';
  const email = user?.email ?? '';

  const initials = useMemo(() => {
    const name = fullName.trim() || username;
    return name.slice(0, 1).toUpperCase();
  }, [fullName, username]);

  async function loadData(showRefresh = false) {
    if (!user) return;

    showRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    const [profile, paymentMethods] = await Promise.all([
      getMyProfile(user.id),
      listMyPaymentMethods(user.id),
    ]);

    setFullName(profile?.full_name ?? '');
    setAvatarUrl(profile?.avatar_url ?? '');
    setMethods(paymentMethods);

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleSaveProfile() {
    if (!user) return;
    setSavingProfile(true);
    setError(null);
    setSuccess(null);

    const result = await updateMyProfile(user.id, {
      full_name: fullName.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    });

    setSavingProfile(false);

    if (!result.success) {
      setError(result.error ?? 'No se pudo guardar el perfil.');
      return;
    }

    setSuccess('Perfil actualizado.');
  }

  function resetCardForm() {
    setCardBrand('visa');
    setCardLast4('');
    setExpMonth('');
    setExpYear('');
    setHolderName('');
    setMarkDefault(methods.length === 0);
  }

  async function handleAddMethod() {
    if (!user) return;

    const last4 = cardLast4.replace(/[^0-9]/g, '').slice(0, 4);
    const month = parseInt(expMonth, 10);
    const year = parseInt(expYear, 10);

    if (last4.length !== 4 || Number.isNaN(month) || Number.isNaN(year)) {
      setError('Completa correctamente últimos 4, mes y año.');
      return;
    }

    if (month < 1 || month > 12) {
      setError('El mes debe estar entre 1 y 12.');
      return;
    }

    if (year < new Date().getFullYear()) {
      setError('El año de expiración no puede ser pasado.');
      return;
    }

    setSavingMethod(true);
    setError(null);
    setSuccess(null);

    const result = await saveMyPaymentMethod({
      userId: user.id,
      cardBrand,
      cardLast4: last4,
      expMonth: month,
      expYear: year,
      holderName: holderName.trim() || undefined,
      isDefault: markDefault,
    });

    setSavingMethod(false);

    if (!result.success) {
      setError(result.error ?? 'No se pudo guardar el método de pago.');
      return;
    }

    await loadData();
    resetCardForm();
    setSuccess('Método de pago agregado.');
  }

  async function handleSetDefault(methodId: string) {
    if (!user) return;
    setError(null);
    const result = await setDefaultPaymentMethod(user.id, methodId);
    if (!result.success) {
      setError(result.error ?? 'No se pudo marcar como predeterminada.');
      return;
    }
    await loadData();
    setSuccess('Tarjeta predeterminada actualizada.');
  }

  async function handleDeleteMethod(methodId: string) {
    if (!user) return;
    const result = await removePaymentMethod(user.id, methodId);
    if (!result.success) {
      setError(result.error ?? 'No se pudo eliminar el método.');
      return;
    }
    await loadData();
    setSuccess('Método eliminado.');
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.accent} />}
    >
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <>
          <View style={styles.hero}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{fullName.trim() || username}</Text>
              <Text style={styles.heroSub}>{email}</Text>
            </View>
            <Ionicons name="person-circle-outline" size={28} color={colors.accent} />
          </View>

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

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Perfil</Text>
            <Input
              label="Nombre completo"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Tu nombre"
            />
            <Input
              label="Avatar URL (opcional)"
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="https://..."
              autoCapitalize="none"
            />
            <Button
              title={savingProfile ? 'Guardando...' : 'Guardar perfil'}
              onPress={handleSaveProfile}
              loading={savingProfile}
              icon={<Ionicons name="save-outline" size={16} color="#fff" />}
            />
          </Card>

          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Métodos de pago</Text>
              <View style={styles.safeBadge}>
                <Ionicons name="shield-checkmark" size={12} color={colors.primaryDark} />
                <Text style={styles.safeBadgeText}>Solo metadata</Text>
              </View>
            </View>

            <Text style={styles.disclaimer}>
              No almacenamos número completo ni CVV. Solo guardamos marca, últimos 4 y expiración.
            </Text>

            <View style={styles.brandRow}>
              {BRANDS.map((brand) => {
                const active = cardBrand === brand;
                return (
                  <TouchableOpacity
                    key={brand}
                    style={[styles.brandChip, active && styles.brandChipActive]}
                    onPress={() => setCardBrand(brand)}
                  >
                    <Text style={[styles.brandChipText, active && styles.brandChipTextActive]}>{brand.toUpperCase()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label="Últimos 4 dígitos"
              value={cardLast4}
              onChangeText={(v) => setCardLast4(v.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="4242"
              keyboardType="number-pad"
              maxLength={4}
            />

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Mes"
                  value={expMonth}
                  onChangeText={(v) => setExpMonth(v.replace(/[^0-9]/g, '').slice(0, 2))}
                  placeholder="08"
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Año"
                  value={expYear}
                  onChangeText={(v) => setExpYear(v.replace(/[^0-9]/g, '').slice(0, 4))}
                  placeholder="2028"
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
            </View>

            <Input
              label="Titular (opcional)"
              value={holderName}
              onChangeText={setHolderName}
              placeholder="Nombre del titular"
            />

            <TouchableOpacity style={styles.defaultToggle} onPress={() => setMarkDefault((v) => !v)}>
              <Ionicons
                name={markDefault ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={markDefault ? colors.primary : colors.textMuted}
              />
              <Text style={styles.defaultToggleText}>Marcar como predeterminada</Text>
            </TouchableOpacity>

            <Button
              title={savingMethod ? 'Guardando...' : 'Agregar método'}
              onPress={handleAddMethod}
              loading={savingMethod}
              icon={<Ionicons name="card-outline" size={16} color="#fff" />}
            />

            <View style={styles.savedMethodsWrap}>
              {methods.length === 0 ? (
                <Text style={styles.emptyMethods}>Aún no tienes métodos guardados.</Text>
              ) : (
                methods.map((method) => (
                  <View key={method.id} style={styles.methodCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.methodTitle}>
                        {method.card_brand.toUpperCase()} **** {method.card_last4}
                      </Text>
                      <Text style={styles.methodSub}>
                        Exp: {String(method.exp_month).padStart(2, '0')}/{method.exp_year}
                        {method.holder_name ? ` · ${method.holder_name}` : ''}
                      </Text>
                    </View>

                    <View style={styles.methodActions}>
                      {method.is_default ? (
                        <View style={styles.defaultPill}>
                          <Text style={styles.defaultPillText}>Predeterminada</Text>
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => handleSetDefault(method.id)} style={styles.methodIconBtn}>
                          <Ionicons name="star-outline" size={16} color={colors.primary} />
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity onPress={() => handleDeleteMethod(method.id)} style={styles.methodIconBtn}>
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  hero: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.md,
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '800',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    marginTop: 2,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error + '40',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: { fontSize: 12, color: colors.error, flex: 1 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  successText: { fontSize: 12, color: colors.success, fontWeight: '700' },

  sectionCard: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentLight,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 3,
  },
  safeBadgeText: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },

  brandRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  brandChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceMuted,
  },
  brandChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  brandChipText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
  },
  brandChipTextActive: {
    color: colors.accent,
  },

  rowFields: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  defaultToggleText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },

  savedMethodsWrap: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  emptyMethods: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  methodCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodTitle: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '800',
  },
  methodSub: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textMuted,
  },
  methodActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  methodIconBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  defaultPill: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 3,
  },
  defaultPillText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
});
