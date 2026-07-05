// Single source of truth for the app's visual language.
// Palette consolidates the colors already established across the built screens.
export const COLORS = {
  purple: "#8A00E6",
  purpleDark: "#5F02B0",
  purpleLight: "#7B4DFF",
  purpleSoft: "#DDB9FF",
  green: "#52F04A",
  greenDark: "#119600",
  gold: "#FFD93D",
  goldDark: "#F0A500",
  pink: "#C70F52",
  red: "#D90429",
  bg: "#F6F4FB",
  card: "#FFFFFF",
  ink: "#211A2E",
  muted: "#6C7075",
  line: "#E9E4F2",
  white: "#FFFFFF",
};

export const RADIUS = {
  md: 16,
  lg: 22,
  xl: 28,
};

// Claymorphism depth: soft colored shadow on iOS, elevation on Android.
export const clay = (shadowColor = "#000", depth = 8) => ({
  shadowColor,
  shadowOffset: { width: 0, height: depth },
  shadowOpacity: 0.22,
  shadowRadius: depth + 2,
  elevation: depth + 2,
});
