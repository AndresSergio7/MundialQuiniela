import React from 'react';
import { View, Text, Image } from 'react-native';

// Fallback glyphs by rank position (used in standings)
const RANK_GLYPHS: Record<number, string> = { 1: '👑', 2: '⚡', 3: '🌟' };
const DEFAULT_GLYPH = '⚽';

interface UserAvatarProps {
  /** Public URL of the user's avatar, if any */
  avatarUrl?: string | null;
  /** Display name or username — used to derive the fallback initial */
  name?: string | null;
  /** Rank position — drives the fallback emoji when there's no avatar */
  rank?: number;
  /** Diameter of the circle in pixels */
  size?: number;
  /** Border color (optional) */
  borderColor?: string;
  borderWidth?: number;
  /** Background color for the fallback circle */
  backgroundColor?: string;
  /** Text color for the fallback initial */
  textColor?: string;
}

export function UserAvatar({
  avatarUrl,
  name,
  rank,
  size = 40,
  borderColor,
  borderWidth = 0,
  backgroundColor = '#F1F3F2',
  textColor = '#fff',
}: UserAvatarProps) {
  const borderRadius = size / 2;
  const containerStyle = {
    width: size,
    height: size,
    borderRadius,
    borderColor: borderColor ?? 'transparent',
    borderWidth,
    backgroundColor,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  if (avatarUrl) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius }}
          resizeMode="cover"
        />
      </View>
    );
  }

  const initial = name ? name.slice(0, 1).toUpperCase() : null;
  const fontSize = size * 0.42;
  const glyphSize = size * 0.48;

  // Sin rank → inicial del nombre (ej. lista de miembros, hero button)
  if (rank == null) {
    return (
      <View style={containerStyle}>
        <Text style={{ fontSize, fontWeight: '900', color: initial ? textColor : '#aaa' }}>
          {initial ?? '?'}
        </Text>
      </View>
    );
  }

  // Con rank → emoji del podio o balón genérico
  return (
    <View style={containerStyle}>
      <Text style={{ fontSize: glyphSize }}>{RANK_GLYPHS[rank] ?? DEFAULT_GLYPH}</Text>
    </View>
  );
}
