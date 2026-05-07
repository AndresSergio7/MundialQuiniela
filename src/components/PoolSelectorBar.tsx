import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePoolStore } from '@/store/pool';
import { colors, spacing, radius, shadows } from '@/components/ui/theme';
import type { Pool } from '@/types';

interface PoolSelectorBarProps {
  onPoolChange?: (pool: Pool) => void;
  contextLabel?: string;
  rightBadgeText?: string;
  showDecorations?: boolean;
}

export function PoolSelectorBar({
  onPoolChange,
  contextLabel = 'MI QUINIELA',
  rightBadgeText,
  showDecorations = true,
}: PoolSelectorBarProps) {
  const { currentPool, pools, setCurrentPool } = usePoolStore();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const canSwitch = pools.length > 1;

  function handleSelect(pool: Pool) {
    setCurrentPool(pool);
    setModalVisible(false);
    onPoolChange?.(pool);
  }

  return (
    <>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, spacing.sm) + spacing.xs }]}>
        {showDecorations && (
          <>
            <View style={styles.ball1} />
            <View style={styles.ball2} />
            <View style={styles.ball3} />
          </>
        )}

        <View style={styles.headerTopRow}>
          <Text style={styles.label}>{contextLabel}</Text>
          <View style={styles.headerActions}>
            {!!rightBadgeText && (
              <View style={styles.rightBadge}>
                <Text style={styles.rightBadgeText}>{rightBadgeText}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.rulesBtn}
              onPress={() => router.push('/(app)/rules')}
              activeOpacity={0.84}
            >
              <Ionicons name="help-circle-outline" size={15} color={colors.primaryDark} />
              <Text style={styles.rulesBtnText}>Reglas</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.selectorChip}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.82}
        >
          <View style={styles.selectorDot} />
          <Text style={styles.selectorText} numberOfLines={1}>
            {currentPool?.name ?? 'Sin quiniela'}
          </Text>
          <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.86)" />
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Ionicons name="trophy" size={20} color={colors.accent} />
              <Text style={styles.sheetTitle}>Mis Quinielas</Text>
            </View>
            <FlatList
              data={pools}
              keyExtractor={(p) => p.id}
              renderItem={({ item: pool }) => {
                const isActive = pool.id === currentPool?.id;
                return (
                  <TouchableOpacity
                    style={[styles.poolItem, isActive && styles.poolItemActive]}
                    onPress={() => handleSelect(pool)}
                  >
                    <View style={styles.poolItemLeft}>
                      <View style={[styles.poolDot, isActive && styles.poolDotActive]} />
                      <Text style={[styles.poolItemText, isActive && styles.poolItemTextActive]}>
                        {pool.name}
                      </Text>
                    </View>
                    {isActive && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0B4A2E',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg + spacing.xs,
    overflow: 'hidden',
    position: 'relative',
  },
  ball1: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -80,
    right: -36,
  },
  ball2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(201,168,76,0.08)',
    bottom: -48,
    left: -10,
  },
  ball3: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.28)',
    top: 22,
    left: 40,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 1,
    fontFamily: 'BarlowCondensed_700Bold',
    marginBottom: 2,
  },
  rightBadge: {
    minHeight: 26,
    borderRadius: 13,
    paddingHorizontal: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  rightBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'BarlowCondensed_700Bold',
  },
  rulesBtn: {
    minHeight: 26,
    borderRadius: 13,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  rulesBtnText: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '800',
    fontFamily: 'BarlowCondensed_700Bold',
  },
  selectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.xs + 2,
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: spacing.sm + 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  selectorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  selectorText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'BarlowCondensed_700Bold',
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    ...shadows.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  poolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  poolItemActive: { backgroundColor: colors.successLight },
  poolItemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  poolDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  poolDotActive: { backgroundColor: colors.primary },
  poolItemText: { fontSize: 15, color: colors.text, fontWeight: '500' },
  poolItemTextActive: { color: colors.primary, fontWeight: '700' },
  cancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelText: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
});
