// ============================================================
// MUNDIAL QUINIELA — Design System
// World Cup 2026 · Championship Edition
// ============================================================

export const colors = {
  // ---- Brand greens (football pitch identity) ----
  primary:       '#0A6B35',  // Championship green
  primaryDark:   '#084D26',  // Deep pitch green
  primaryLight:  '#12934A',  // Bright field green

  // ---- Trophy gold (premium accent) ----
  accent:        '#C9A84C',  // Championship gold
  accentBright:  '#E8C547',  // Bright gold highlight
  accentLight:   '#FDF6DC',  // Pale gold surface

  // ---- Navy (depth + contrast) ----
  navy:          '#0D1B2A',  // Deep midnight
  navyMid:       '#1B3A57',  // Stadium dark

  // ---- Competition red ----
  red:           '#C0392B',  // Action red

  // ---- Neutrals ----
  background:    '#EEF2F7',  // Cool off-white field
  surface:       '#FFFFFF',  // Card white
  surfaceMuted:  '#F7F9FC',  // Slightly off-white

  // ---- Text ----
  text:          '#0D1B2A',  // Primary text (navy)
  textMuted:     '#556B82',  // Secondary text
  textLight:     '#8FA9C0',  // Placeholder / caption

  // ---- Borders ----
  border:        '#D9E3EE',  // Default border
  borderLight:   '#EEF2F7',  // Hairline

  // ---- Semantic ----
  success:       '#0A6B35',
  successLight:  '#E6F4EC',
  warning:       '#D97706',
  warningLight:  '#FEF3C7',
  error:         '#C0392B',
  errorLight:    '#FDECEA',

  // ---- Medal tier (standings) ----
  gold:          '#C9A84C',
  goldLight:     '#FDF6DC',
  silver:        '#94A3B8',
  silverLight:   '#F1F5F9',
  bronze:        '#B87B4D',
  bronzeLight:   '#FDF0E6',

  // ---- Overlays ----
  overlay:       'rgba(13,27,42,0.62)',
  overlayLight:  'rgba(13,27,42,0.35)',

  // ---- Legacy aliases (keep old keys working) ----
  secondary:     '#C0392B',
  textMuted:     '#556B82',
} as const;

export const spacing = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   18,
  xl:   24,
  full: 9999,
} as const;

export const typography = {
  h1:      { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2:      { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3:      { fontSize: 18, fontWeight: '700' as const },
  h4:      { fontSize: 15, fontWeight: '700' as const },
  body:    { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyMd:  { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label:   { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.2 },
  tiny:    { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.3 },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0D1B2A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  gold: {
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 6,
  },
} as const;
