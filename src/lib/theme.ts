/** Mentorship+ design tokens — shared across iOS and Android. */
export const colors = {
  // Brand
  ink: "#111827",
  navy: "#172554",
  primary: "#2937F5",
  primaryDark: "#202CC7",
  teal: "#0F766E",
  accentTint: "#E8EBFF",
  champagne: "#D6C3A1",

  // Surfaces and text
  bg: "#F7F8FA",
  surface: "#FFFFFF",
  surfaceSecondary: "#F1F5F9",
  muted: "#64748B",
  mutedLight: "#94A3B8",
  line: "#E2E8F0",
  glass: "rgba(255,255,255,0.88)",
  glassBorder: "rgba(255,255,255,0.72)",

  // Legacy aliases retained so existing screens keep working
  softBlue: "#E8EEF8",
  softTeal: "#E8EBFF",
  amber: "#FEF3C7",
  danger: "#B91C1C",
  softRed: "#FEE2E2",
  purple: "#7565C7",

  // Semantic
  success: "#15803D",
  successBg: "#DCFCE7",
  warning: "#B45309",
  warningBg: "#FEF3C7",
  error: "#B91C1C",
  errorBg: "#FEE2E2",
  info: "#1D4ED8",
  infoBg: "#DBEAFE",
  white: "#FFFFFF",

  // Added by the UI/UX pass (all additive; nothing above was changed)
  /** Placeholder text: ~3.7:1 on white, readable without looking like entered text. */
  placeholder: "#7C8798",
  /** Light brand surface used for selected states and icon badges. */
  brandSurface: "#F4F5FF",
  brandBorder: "#DCE1FF",
  /** Hairline border shared by every card. */
  cardBorder: "#E8EDF4",
  overlay: "rgba(15,23,42,0.45)",
  /** Text on dark (navy / primary) surfaces. */
  onDark: "#E2E8F0",
  onDarkMuted: "#CBD5E1",
  mint: "#99F6E4",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 28 };
export const radii = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 };

/** Type scale. Use these instead of ad-hoc font sizes so screens stay consistent. */
export const type = {
  display: { fontSize: 32, lineHeight: 39, fontWeight: "800" as const, letterSpacing: -1 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "800" as const, letterSpacing: -0.7 },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: "800" as const, letterSpacing: -0.3 },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: "800" as const, letterSpacing: -0.1 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: "700" as const },
  small: { fontSize: 13, lineHeight: 19, fontWeight: "400" as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: "400" as const },
};

/** Elevation presets shared by cards and floating surfaces. */
export const shadows = {
  card: {
    shadowColor: "#172554",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.055,
    shadowRadius: 16,
    elevation: 2,
  },
  raised: {
    shadowColor: "#172554",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 6,
  },
};

/** Layout constants. `maxContentWidth` keeps lines readable on tablets and the web build. */
export const layout = { maxContentWidth: 640, minTouchTarget: 44 };
