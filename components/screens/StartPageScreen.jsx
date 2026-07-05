import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import PressableScale from "../PressableScale";
import { COLORS, RADIUS } from "../../constants/theme";

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
      <View style={styles.hero}>
        <Text style={styles.title}>LAUNCH{"\n"}YOUR{"\n"}CAREER</Text>
        <View style={styles.logoCircle}>
          <Ionicons name="rocket" size={34} color={COLORS.white} />
        </View>
      </View>

      {/* CTAs */}
      <View style={styles.ctas}>
        <HardShadowButton
          style={styles.getStarted}
          rotate="-3deg"
          onPress={() => router.push("/(auth)/signup")}
        >
          <Text style={styles.getStartedText}>GET STARTED</Text>
        </HardShadowButton>

        <HardShadowButton
          style={styles.login}
          rotate="-2deg"
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.loginText}>LOGIN</Text>
        </HardShadowButton>
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
    fontWeight: "900",
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
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  login: {
    backgroundColor: "#F5E11A",
    paddingHorizontal: 52,
  },

  loginText: {
    color: "#000",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.5,
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
