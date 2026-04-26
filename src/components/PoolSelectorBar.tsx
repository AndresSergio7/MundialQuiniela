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
      <View style={styles.container}>
        <View style={styles.ball1} />
        <View style={styles.ball2} />
        <View style={styles.ball3} />
        <TouchableOpacity
          style={styles.card}
          onPress={() => canSwitch && setModalVisible(true)}
          activeOpacity={canSwitch ? 0.82 : 1}
        >
          <View style={styles.left}>
            <View style={styles.trophyWrap}>
              <Ionicons name="trophy" size={15} color={colors.primary} />
            </View>
            <View style={styles.poolInfo}>
              <Text style={styles.poolLabel}>LIGA ACTIVA</Text>
              <Text style={styles.poolName} numberOfLines={1}>
                {currentPool?.name ?? 'Selecciona una quiniela'}
              </Text>
            </View>
          </View>
          {canSwitch && (
            <View style={styles.changeChip}>
              <Text style={styles.changeText}>Cambiar</Text>
              <Ionicons name="chevron-down" size={12} color={colors.primary} />
            </View>
          )}
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
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  ball1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -60,
    right: -30,
  },
  ball2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(201,168,76,0.08)',
    bottom: -40,
    left: -10,
  },
  ball3: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.28)',
    top: 10,
    left: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 5,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  trophyWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolInfo: {
    flex: 1,
  },
  poolLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.2,
  },
  poolName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.1,
  },
  changeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    gap: 4,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
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
