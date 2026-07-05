import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import PressableScale from "../PressableScale";
import { COLORS, RADIUS, clay } from "../../constants/theme";

export default function StartPageScreen() {
  return (
    <LinearGradient
      colors={[COLORS.purple, COLORS.purpleDark]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons name="rocket" size={64} color={COLORS.gold} />
          </View>
          <Text style={styles.title}>Launch Your Career</Text>
          <Text style={styles.tagline}>
            One mission a day. Build your streak, climb your school's
            leaderboard, and turn points into prizes.
          </Text>
        </View>

        <View style={styles.ctas}>
          <PressableScale
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.push("/(auth)/signup")}
          >
            <Text style={styles.primaryText}>Sign Up</Text>
            <Ionicons name="arrow-forward" size={22} color={COLORS.ink} />
          </PressableScale>

          <PressableScale
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.secondaryText}>Log In</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  hero: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    width: 128,
    height: 128,
    borderRadius: RADIUS.xl,
    backgroundColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
    transform: [{ rotate: "-6deg" }],
  },
  title: {
    color: COLORS.white,
    fontSize: 40,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 14,
  },
  tagline: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 17,
    lineHeight: 25,
    textAlign: "center",
  },
  ctas: {
    paddingBottom: 28,
    gap: 14,
  },
  button: {
    height: 58,
    borderRadius: RADIUS.lg,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  primaryButton: {
    backgroundColor: COLORS.gold,
    ...clay(COLORS.goldDark, 6),
  },
  primaryText: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: "900",
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.45)",
  },
  secondaryText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "800",
  },
});
