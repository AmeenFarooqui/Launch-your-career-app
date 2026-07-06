import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Pulse } from "./motion";
import { COLORS } from "../constants/theme";

// The app-wide background: deep purple night sky with stars.
// Wrap every screen in this so the whole app shares one identity.
const DOTS = [
  { top: "6%", left: "12%", s: 3, o: 0.8 },
  { top: "9%", right: "18%", s: 2, o: 0.6 },
  { top: "16%", left: "72%", s: 3, o: 0.7 },
  { top: "22%", left: "28%", s: 2, o: 0.5 },
  { top: "31%", right: "8%", s: 3, o: 0.8 },
  { top: "38%", left: "8%", s: 2, o: 0.6 },
  { top: "47%", right: "24%", s: 3, o: 0.5 },
  { top: "55%", left: "18%", s: 2, o: 0.7 },
  { top: "63%", right: "12%", s: 2, o: 0.6 },
  { top: "72%", left: "40%", s: 3, o: 0.5 },
  { top: "80%", right: "30%", s: 2, o: 0.7 },
  { top: "86%", left: "10%", s: 3, o: 0.6 },
];

export default function Screen({ children, edges = ["top"], style }) {
  return (
    <LinearGradient
      colors={[COLORS.nightLight, COLORS.night]}
      style={styles.flex}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {DOTS.map((d, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                top: d.top,
                left: d.left,
                right: d.right,
                width: d.s,
                height: d.s,
                borderRadius: d.s / 2,
                opacity: d.o,
              },
            ]}
          />
        ))}
        <Pulse to={1.5} duration={1400} style={[styles.spark, styles.sparkTop]}>
          <Ionicons name="star" size={12} color={COLORS.gold} />
        </Pulse>
        <Pulse to={1.4} duration={1900} style={[styles.spark, styles.sparkMid]}>
          <Ionicons name="star" size={9} color={COLORS.gold} />
        </Pulse>
      </View>

      <SafeAreaView style={[styles.flex, style]} edges={edges}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  dot: {
    position: "absolute",
    backgroundColor: COLORS.white,
  },
  spark: {
    position: "absolute",
  },
  sparkTop: {
    top: "12%",
    right: "10%",
  },
  sparkMid: {
    top: "58%",
    left: "6%",
  },
});
