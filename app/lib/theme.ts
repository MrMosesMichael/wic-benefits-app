/**
 * WIC Benefits App — Centralized Theme
 *
 * "Farmers Market Morning" — inspired by the cornucopia icon.
 * Soft mint greens, warm cream, forest accents, pops of coral & gold.
 */

export const colors = {
  // ── Core ──────────────────────────────────────
  /** Forest green — header bar, primary brand */
  header: '#3A7D5C',
  /** Deep teal-navy — primary text (from "WIC" lettering) */
  navy: '#1B3A4B',

  // ── Backgrounds ───────────────────────────────
  /** Soft mint — screen backgrounds (the garden) */
  screenBg: '#E8F4E0',
  /** Warm cream — card backgrounds (sunlit paper) */
  cardBg: '#FFFBF0',
  /** White — inputs / modals */
  white: '#FFFFFF',

  // ── Accents ───────────────────────────────────
  /** Golden wheat — warm highlights, accents */
  wheat: '#D4A052',
  /** Deeper gold — secondary accent */
  amber: '#C98B3F',
  /** Teal blue — from cornucopia horn stripes */
  dustyBlue: '#6BA3B5',
  /** Coral — from the apple, warm pop for alerts */
  softPink: '#E07B5F',

  // ── Borders & Muted ───────────────────────────
  /** Soft sage — card borders (garden fence) */
  border: '#B8D4B8',
  /** Light sage — subtle dividers */
  borderLight: '#D4E8D4',
  /** Sage gray — secondary text */
  muted: '#7A917A',

  // ── Semantic ──────────────────────────────────
  /** Available / in-stock */
  success: '#5A9E5A',
  /** Low stock / in-cart */
  warning: '#D4A052',
  /** Consumed / unavailable */
  consumed: '#A8B8A8',
  /** Error / out-of-stock */
  danger: '#C45C5C',
} as const;

export const fonts = {
  /** Card titles, section headers */
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.navy,
  },
  /** Body text */
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: colors.navy,
  },
  /** Secondary / muted text */
  secondary: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: colors.muted,
  },
  /** Button label */
  button: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.navy,
  },
};

/** Shared card style — outlined, soft fill */
export const card = {
  backgroundColor: colors.cardBg,
  borderWidth: 1.5,
  borderColor: colors.border,
  borderRadius: 12,
  padding: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
} as const;
