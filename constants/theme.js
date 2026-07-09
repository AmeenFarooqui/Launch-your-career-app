// Single source of truth for the app's visual language.
// Brand token palette (2026-07): Electric Purple primary, Neon Green secondary,
// Electric Blue tertiary, Cyber Yellow warnings — on the night-sky identity.
export const COLORS = {
  purple: "#8800DE", // primary — buttons, hero
  purpleDark: "#5C0097", // derived dark shade of primary
  purpleLight: "#C683FF", // primary-container — purple tint
  purpleSoft: "#DDB9FF", // light purple for icons on dark surfaces
  blue: "#0047FF", // tertiary — highlights, accents (diamonds)
  green: "#59EE50", // secondary-container — active/open chip, success fill
  greenDark: "#006B0A", // secondary — success, actions
  gold: "#FEEF00", // tertiary-container Cyber Yellow — warnings, rewards
  goldDark: "#C7B500", // derived — shadows and decorative icons only (low contrast as text)
  pink: "#C70F52",
  red: "#D90429",
  bg: "#F6F6F6", // background — soft off-white surfaces
  card: "#FFFFFF",
  ink: "#2D2F2F", // on-surface — body text
  muted: "#6C7075",
  line: "#E7E7E7",
  white: "#FFFFFF",
  // App-wide night-sky background
  night: "#1D0A33",
  nightLight: "#3A0E6B",
  lavender: "#C9B8E8",
};

export const RADIUS = {
  md: 16,
  lg: 22,
  xl: 28,
};

// Display font for headings, big numbers, and buttons. Custom font families
// encode their own weight — don't combine with fontWeight (breaks Android).
export const FONTS = {
  heading: "Baloo2_800ExtraBold",
  subheading: "Baloo2_700Bold",
};

// Type scale — the ONLY font sizes screens may use (mobile-app-ui-design:
// max 4 sizes + hero). Big numbers/timers also set fontVariant tabular-nums.
export const TYPE = {
  hero: 48, // StartPage title, Result verdict, giant stats
  h1: 28, // screen titles
  h2: 22, // card titles, buttons
  body: 16, // content, answers, inputs
  caption: 13, // labels, meta, footnotes
};

// Claymorphism depth: soft colored shadow on iOS, elevation on Android.
export const clay = (shadowColor = "#000", depth = 8) => ({
  shadowColor,
  shadowOffset: { width: 0, height: depth },
  shadowOpacity: 0.22,
  shadowRadius: depth + 2,
  elevation: depth + 2,
});
