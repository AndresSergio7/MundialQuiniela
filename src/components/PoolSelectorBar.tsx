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
import { usePoolStore } from '@/store/pool';
import { colors, spacing, typography, radius, shadows } from '@/components/ui/theme';
import type { Pool } from '@/types';

interface PoolSelectorBarProps {
  onPoolChange?: (pool: Pool) => void;
}

export function PoolSelectorBar({ onPoolChange }: PoolSelectorBarProps) {
  const { currentPool, pools, setCurrentPool } = usePoolStore();
  const [modalVisible, setModalVisible] = useState(false);

  const canSwitch = pools.length > 1;

  function handleSelect(pool: Pool) {
    setCurrentPool(pool);
    setModalVisible(false);
    onPoolChange?.(pool);
  }

  return (
    <>
      <TouchableOpacity
        style={styles.bar}
        onPress={() => canSwitch && setModalVisible(true)}
        activeOpacity={canSwitch ? 0.78 : 1}
      >
        <View style={styles.left}>
          <View style={styles.trophyDot}>
            <Ionicons name="trophy" size={12} color={colors.accent} />
          </View>
          <Text style={styles.poolName} numberOfLines={1}>
            {currentPool?.name ?? 'Selecciona una quiniela'}
          </Text>
        </View>
        {canSwitch && (
          <View style={styles.changeChip}>
            <Text style={styles.changeText}>Cambiar</Text>
            <Ionicons name="chevron-down" size={12} color={colors.accent} />
          </View>
        )}
      </TouchableOpacity>

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
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  trophyDot: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    letterSpacing: 0.1,
  },
  changeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201,168,76,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.4)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 3,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.3,
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
