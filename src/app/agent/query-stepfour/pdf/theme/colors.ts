/**
 * Central color palette. Nothing outside this file should hardcode a hex
 * value — every component/section imports COLORS and reads from here so a
 * rebrand is a one-file change.
 */
export const COLORS = {
  primary: '#0B4F4A',        // deep emerald — brand anchor
  primaryDark: '#083B37',
  primaryLight: '#E6F0EE',   // tint for banners / card fills
  secondary: '#0E6E62',
  accent: '#C6A15B',         // muted gold — premium accents, dividers, badges
  accentLight: '#F5EEDD',

  success: '#1B8A5A',
  successLight: '#E8F5EE',
  warning: '#B98900',
  warningLight: '#FBF3DE',
  danger: '#B3261E',
  dangerLight: '#FBEAE9',

  textPrimary: '#1A2333',
  textSecondary: '#65707A',
  textMuted: '#9AA5AD',
  textOnDark: '#FFFFFF',

  bgLight: '#F7F8F9',
  bgCard: '#FFFFFF',
  bgDark: '#0B2B2A',

  border: '#E3E7E9',
  borderStrong: '#C7CFD3',
  watermark: '#94A3B8',
};
