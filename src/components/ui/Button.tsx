import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { colors, spacing, radius, shadows } from './theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = true,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle[] = [
    styles.base,
    styles[variant] as ViewStyle,
    (styles as any)[`size_${size}`] as ViewStyle,
    fullWidth ? styles.fullWidth : {},
    isDisabled ? styles.disabled : {},
    style ?? {},
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : '#fff'}
          size="small"
        />
      ) : (
        <View style={styles.inner}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={[styles.text, (styles as any)[`${variant}Text`] as TextStyle, textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconWrap: { marginRight: spacing.xs },
  fullWidth: { width: '100%' },

  primary:   { backgroundColor: colors.primary, ...shadows.md },
  secondary: { backgroundColor: colors.navy, ...shadows.md },
  gold:      { backgroundColor: colors.accent, ...shadows.gold },
  outline:   { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  ghost:     { backgroundColor: 'transparent' },
  danger:    { backgroundColor: colors.error, ...shadows.sm },
  disabled:  { opacity: 0.45 },

  size_sm: { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, minHeight: 36 },
  size_md: { paddingVertical: spacing.sm + 4, paddingHorizontal: spacing.lg, minHeight: 50 },
  size_lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, minHeight: 56 },

  text:          { fontWeight: '700', fontSize: 15, letterSpacing: 0.2 },
  primaryText:   { color: '#fff' },
  secondaryText: { color: '#fff' },
  goldText:      { color: colors.navy },
  outlineText:   { color: colors.primary },
  ghostText:     { color: colors.primary },
  dangerText:    { color: '#fff' },
});
