import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from './ui/theme';

interface AvatarProps {
  name: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
}

export function Avatar({ name, size = 36, backgroundColor = colors.primaryDark, textColor = '#fff' }: AvatarProps) {
  const letter = (name?.[0] ?? '?').toUpperCase();
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}>
      <Text style={[styles.letter, { fontSize: size * 0.4, color: textColor }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '800' },
});
