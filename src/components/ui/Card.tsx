import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, radius, shadows } from './theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'flat' | 'dark' | 'gold';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    padding: spacing.md,
    overflow: 'hidden',
  },
  default: {
    backgroundColor: colors.surface,
    ...shadows.md,
  },
  elevated: {
    backgroundColor: colors.surface,
    ...shadows.lg,
  },
  flat: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dark: {
    backgroundColor: colors.navy,
  },
  gold: {
    backgroundColor: colors.accentLight,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
});
