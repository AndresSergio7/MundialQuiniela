export const colors = {
  primary: '#0a2463',
  secondary: '#e63946',
  accent: '#f4a261',
  background: '#f8f9fa',
  surface: '#ffffff',
  text: '#1d1d1d',
  textMuted: '#6c757d',
  border: '#dee2e6',
  success: '#2a9d8f',
  warning: '#e9c46a',
  error: '#e63946',
  gold: '#ffd700',
  silver: '#c0c0c0',
  bronze: '#cd7f32',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '500' as const },
} as const;
