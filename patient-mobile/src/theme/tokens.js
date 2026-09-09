/**
 * MediKiosk Design System Tokens
 * Public-service healthcare UI with high legibility, accessible touch targets, and vibrant color palettes
 */

export const COLORS = {
  // Institutional Navy Palette
  primaryNavy: '#0B2545',
  deepNavy: '#07182E',
  navyHover: '#133966',
  navyLight: '#EBF1F8',

  // Indian Public Service Saffron Accent
  saffron: '#E77817',
  saffronLight: '#FFF4EB',
  saffronDark: '#C45E09',
  saffronGlow: 'rgba(231, 120, 23, 0.15)',

  // Healthcare Emerald & Status States
  healthcareGreen: '#16855B',
  greenLight: '#E6F4ED',
  greenDark: '#0D5E3F',

  // Healthcare Azure Blue
  azure: '#1D6FBA',
  azureLight: '#EBF3FC',

  // Neutral Surfaces & Backgrounds
  background: '#F0F4F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F7FAFC',
  border: '#D1DCE5',
  borderFocus: '#0B2545',

  // Neutral Typography
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textInverted: '#FFFFFF',

  // Alerts & Triage Escalation Levels
  error: '#DC2626',
  errorLight: '#FEF2F2',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  success: '#15803D',
  info: '#2563EB',

  // Focus & Overlays
  focusOutline: '#0B2545',
  overlayBackground: 'rgba(7, 24, 46, 0.70)',
};

export const TYPOGRAPHY = {
  fontFamily: 'System',
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 26,
    xxxl: 32,
  },
  lineHeights: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
    xxl: 36,
    xxxl: 42,
  },
};

export const SPACING = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const SHADOWS = {
  subtle: {
    shadowColor: '#07182E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  card: {
    shadowColor: '#07182E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: '#E77817',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  modal: {
    shadowColor: '#07182E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
};

export const ACCESSIBILITY = {
  minTouchSize: 52, // 52px touch target height for kiosk & mobile
  fontSizeMultiplier: 1.0,
};
