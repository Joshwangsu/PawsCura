// Design tokens for PawsCura
// Palette: #FFF8F1, #F3D9BF, #D88D59, #794B35, #302B29
export const Colors = {
  // Primary
  primary: '#794B35',
  primaryDark: '#302B29',
  primaryLight: '#D88D59',
  primaryBg: '#F3D9BF',
  accent: '#D88D59',

  // Backgrounds
  background: '#FFF8F1',
  card: '#FFFFFF',
  inputBg: '#FFF8F1',

  // Text
  textPrimary: '#302B29',
  textSecondary: '#794B35',
  textMuted: '#9E8272',
  textInverse: '#FFF8F1',

  // Status
  success: '#22C55E',
  successBg: '#DCFCE7',
  warning: '#D88D59',
  warningBg: '#F3D9BF',
  danger: '#EF4444',
  dangerBg: '#FEE2E2',
  info: '#D88D59',
  infoBg: '#F3D9BF',

  // UI & Borders (Enforce visible 10%+ contrast edges)
  border: '#E5C5A8',       // Distinct warm edge contrast
  borderLight: '#F3D9BF',  // Subtle inner divider
  borderStrong: '#D88D59', // Focused or emphasized border
  shadow: '#302B29',
  divider: '#F3D9BF',

  // Tab bar
  tabActive: '#794B35',
  tabInactive: '#9E8272',
  tabBar: '#FFF8F1',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
};
