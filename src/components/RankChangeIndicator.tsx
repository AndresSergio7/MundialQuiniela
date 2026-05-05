import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RankChangeIndicatorProps {
  delta: number; // positive = moved up, negative = moved down, 0 = no change
}

export function RankChangeIndicator({ delta }: RankChangeIndicatorProps) {
  if (delta === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.neutral}>—</Text>
      </View>
    );
  }
  const up = delta > 0;
  return (
    <View style={styles.wrap}>
      <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={10} color={up ? '#16A34A' : '#DC2626'} />
      <Text style={[styles.num, { color: up ? '#16A34A' : '#DC2626' }]}>{Math.abs(delta)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 1, minWidth: 22 },
  num: { fontSize: 10, fontWeight: '800' },
  neutral: { fontSize: 10, color: '#94A3B8', fontWeight: '700' },
});
