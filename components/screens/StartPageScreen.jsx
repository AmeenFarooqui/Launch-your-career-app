import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import PressableScale from "../PressableScale";
import { FadeInUp, Float, Pulse } from "../motion";
import { COLORS, RADIUS, FONTS } from "../../constants/theme";

// Hard offset shadow (neubrutalist, per the Proto.io design): a black
// backing view with the button lifted up-left off it.
function HardShadowButton({ style, rotate, onPress, children }) {
  return (
    <View style={{ transform: [{ rotate }] }}>
      <View style={styles.hardShadow}>
        <PressableScale style={[styles.buttonFace, style]} onPress={onPress}>
          {children}
        </PressableScale>
      </View>
    </View>
  );
}

export default function StartPageScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      {/* Purple hero block */}
      <FadeInUp>
        <View style={styles.hero}>
          <Pulse to={1.3} duration={1300} style={[styles.spark, styles.sparkLeft]}>
            <Ionicons name="star" size={20} color={COLORS.gold} />
          </Pulse>
          <Pulse to={1.3} duration={1700} style={[styles.spark, styles.sparkRight]}>
            <Ionicons name="star" size={14} color={COLORS.gold} />
          </Pulse>
          <Pulse to={1.25} duration={1500} style={[styles.spark, styles.sparkMid]}>
            <Ionicons name="star" size={11} color={COLORS.white} />
          </Pulse>

          <Text style={styles.title}>LAUNCH{"\n"}YOUR{"\n"}CAREER</Text>
          <Float range={9}>
            <View style={styles.logoCircle}>
              <Ionicons name="rocket" size={34} color={COLORS.white} />
            </View>
          </Float>
        </View>
      </FadeInUp>

      {/* Floating accents in the open space */}
      <View pointerEvents="none" style={[styles.floaty, styles.floatyCyan]} />
      <View pointerEvents="none" style={[styles.floaty, styles.floatyRed]} />

      {/* CTAs */}
      <View style={styles.ctas}>
        <FadeInUp delay={140}>
          <HardShadowButton
            style={styles.getStarted}
            rotate="-3deg"
            onPress={() => router.push("/(auth)/signup")}
          >
            <Text style={styles.getStartedText}>GET STARTED</Text>
          </HardShadowButton>
        </FadeInUp>

        <FadeInUp delay={260}>
          <HardShadowButton
            style={styles.login}
            rotate="-2deg"
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginText}>LOGIN</Text>
          </HardShadowButton>
        </FadeInUp>
      </View>

      {/* Green jagged hills */}
      <View style={styles.hills} pointerEvents="none">
        <View style={[styles.hill, styles.hillLeft]} />
        <View style={[styles.hill, styles.hillMid]} />
        <View style={[styles.hill, styles.hillRight]} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },

  hero: {
    backgroundColor: "#8E00E8",
    marginHorizontal: 10,
    marginTop: 6,
    borderRadius: RADIUS.xl,
    paddingTop: 36,
    paddingBottom: 30,
    alignItems: "center",
  },

  title: {
    color: COLORS.white,
    fontSize: 52,
    lineHeight: 60,
    fontFamily: FONTS.heading,
    textAlign: "center",
  },

  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },

  ctas: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 34,
    zIndex: 2,
  },

  hardShadow: {
    backgroundColor: "#000",
    borderRadius: RADIUS.md,
  },

  buttonFace: {
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    paddingHorizontal: 40,
    transform: [{ translateX: -6 }, { translateY: -6 }],
  },

  getStarted: {
    backgroundColor: "#B01342",
  },

  getStartedText: {
    color: COLORS.white,
    fontSize: 22,
    fontFamily: FONTS.heading,
    letterSpacing: 0.5,
  },

  login: {
    backgroundColor: "#F5E11A",
    paddingHorizontal: 52,
  },

  loginText: {
    color: "#000",
    fontSize: 22,
    fontFamily: FONTS.heading,
    letterSpacing: 0.5,
  },

  spark: {
    position: "absolute",
  },

  sparkLeft: {
    top: 34,
    left: 30,
  },

  sparkRight: {
    top: 90,
    right: 36,
  },

  sparkMid: {
    bottom: 44,
    left: 52,
  },

  floaty: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#000",
  },

  floatyCyan: {
    backgroundColor: "#3BE8E0",
    right: 34,
    top: "56%",
    transform: [{ rotate: "20deg" }],
  },

  floatyRed: {
    backgroundColor: "#FF5449",
    left: 26,
    top: "68%",
    transform: [{ rotate: "42deg" }],
  },

  hills: {
    height: 130,
    justifyContent: "flex-end",
  },

  hill: {
    position: "absolute",
    backgroundColor: "#4ADE33",
    borderWidth: 4,
    borderColor: "#000",
    width: 220,
    height: 220,
    borderRadius: 24,
  },

  hillLeft: {
    left: -70,
    bottom: -130,
    transform: [{ rotate: "35deg" }],
  },

  hillMid: {
    left: 90,
    bottom: -170,
    transform: [{ rotate: "45deg" }],
    backgroundColor: "#3BCC28",
  },

  hillRight: {
    right: -60,
    bottom: -120,
    transform: [{ rotate: "-30deg" }],
  },
});
