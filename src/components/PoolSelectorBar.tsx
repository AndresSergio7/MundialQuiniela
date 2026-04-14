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
import { colors, spacing, typography, radius } from '@/components/ui/theme';
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
        activeOpacity={canSwitch ? 0.75 : 1}
      >
        <View style={styles.left}>
          <Ionicons name="trophy-outline" size={16} color={colors.accent} />
          <Text style={styles.poolName} numberOfLines={1}>
            {currentPool?.name ?? 'No pool selected'}
          </Text>
        </View>
        {canSwitch && (
          <View style={styles.changeChip}>
            <Text style={styles.changeText}>Change</Text>
            <Ionicons name="chevron-down" size={13} color={colors.accent} />
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
            <Text style={styles.sheetTitle}>Select Pool</Text>
            <FlatList
              data={pools}
              keyExtractor={(p) => p.id}
              renderItem={({ item: pool }) => (
                <TouchableOpacity
                  style={[
                    styles.poolItem,
                    pool.id === currentPool?.id && styles.poolItemActive,
                  ]}
                  onPress={() => handleSelect(pool)}
                >
                  <Text
                    style={[
                      styles.poolItemText,
                      pool.id === currentPool?.id && styles.poolItemTextActive,
                    ]}
                  >
                    {pool.name}
                  </Text>
                  {pool.id === currentPool?.id && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
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
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  poolName: {
    ...typography.label,
    color: '#fff',
    fontWeight: '700',
    marginLeft: spacing.xs,
    flex: 1,
  },
  changeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 3,
  },
  changeText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
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
  poolItemActive: {
    backgroundColor: '#e8edf8',
  },
  poolItemText: {
    ...typography.body,
    color: colors.text,
  },
  poolItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
