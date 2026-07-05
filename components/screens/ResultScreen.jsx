import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import PressableScale from "../PressableScale";
import { COLORS, RADIUS, clay } from "../../constants/theme";

const VARIANTS = {
  correct: {
    gradient: [COLORS.green, COLORS.greenDark],
    icon: "checkmark-circle",
    title: "You got it!",
    subtitle: "That's +10 pts toward your ranking.",
    chip: "+10 pts",
    chipIcon: "diamond",
  },
  incorrect: {
    gradient: [COLORS.pink, COLORS.red],
    icon: "close-circle",
    title: "Not quite!",
    subtitle: "Your streak is safe — come back for tomorrow's mission.",
    chip: "streak saved",
    chipIcon: "flame",
  },
};

export default function ResultScreen({ isCorrect }) {
  const v = VARIANTS[isCorrect ? "correct" : "incorrect"];

  return (
    <LinearGradient colors={v.gradient} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <View style={styles.body}>
          <Ionicons name={v.icon} size={140} color={COLORS.white} />
          <Text style={styles.title}>{v.title}</Text>
          <Text style={styles.subtitle}>{v.subtitle}</Text>

          <View style={styles.chip}>
            <Ionicons name={v.chipIcon} size={22} color={COLORS.ink} />
            <Text style={styles.chipText}>{v.chip}</Text>
          </View>
        </View>

        <PressableScale
          style={styles.continueButton}
          onPress={() => router.replace("/(tabs)/home")}
        >
          <Text style={styles.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={22} color={COLORS.ink} />
        </PressableScale>
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
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: COLORS.white,
    fontSize: 44,
    fontWeight: "900",
    marginTop: 10,
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 17,
    lineHeight: 24,
    textAlign: "center",
    marginTop: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.gold,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: RADIUS.lg,
    marginTop: 26,
    ...clay(COLORS.goldDark, 5),
  },
  chipText: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: "900",
  },
  continueButton: {
    height: 58,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
    ...clay("#000", 6),
  },
  continueText: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: "900",
  },
});
