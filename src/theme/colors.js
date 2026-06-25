// Design tokens for PawsCura
export const Colors = {
  // Primary
  primary: '#2B5A8F',
  primaryDark: '#1E3F66',
  primaryLight: '#4A80B8',
  primaryBg: '#EBF2FB',

  // Backgrounds
  background: '#F8F9FA',
  card: '#FFFFFF',
  inputBg: '#F1F5F9',

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Status
  success: '#22C55E',
  successBg: '#DCFCE7',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  danger: '#EF4444',
  dangerBg: '#FEE2E2',
  info: '#3B82F6',
  infoBg: '#DBEAFE',

  // UI
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  shadow: '#000000',
  divider: '#E5E7EB',

  // Tab bar
  tabActive: '#2B5A8F',
  tabInactive: '#9CA3AF',
  tabBar: '#FFFFFF',
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
