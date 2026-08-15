/**
 * Central color palette. Nothing outside this file should hardcode a hex
 * value — every component/section imports COLORS and reads from here so a
 * rebrand is a one-file change.
 *
 * Palette below is tuned to match the reference brochure (Green Island):
 * deep emerald/teal for the brand header & footer bars, and a soft
 * indigo/lavender for section banner pills — the "Hotels / Accommodations",
 * "Quote Price", "Day-Wise Itinerary" etc. bands in the sample PDF.
 */
export const COLORS = {
  primary: '#0B4F4A',        // deep emerald — brand anchor (header/footer bars)
  primaryDark: '#083B37',
  primaryLight: '#E6F0EE',   // tint for banners / card fills

  secondary: '#0E6E62',
  accent: '#C6A15B',         // muted gold — premium accents, dividers, badges
  accentLight: '#F5EEDD',

  // Indigo/lavender section-banner pair, matching the reference brochure's
  // "Hotels / Accommodations", "Quote Price", "Day-Wise Itinerary" bands.
  bannerFill: '#DEE1F7',
  bannerAccentBar: '#3C3F9E',

  success: '#1B8A5A',
  successLight: '#E8F5EE',
  warning: '#B98900',
  warningLight: '#FBF3DE',
  danger: '#B3261E',
  dangerLight: '#FBEAE9',

  // Small pill badges (e.g. hotel-card "1st Night" tag).
  badgeBg: '#E6F0EE',
  badgeText: '#0B4F4A',

  // Star rating glyphs (hotel cards, price cards).
  starColor: '#C6A15B',

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
