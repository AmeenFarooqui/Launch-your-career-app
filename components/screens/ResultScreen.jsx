import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Share,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import PressableScale from "../PressableScale";
import { COLORS, RADIUS, FONTS, clay } from "../../constants/theme";

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

const CONFETTI_COLORS = [
  COLORS.gold,
  COLORS.purple,
  COLORS.pink,
  COLORS.white,
  COLORS.purpleSoft,
];

function ConfettiPiece({ index, height }) {
  const fall = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fall, {
      toValue: 1,
      duration: 2000 + (index % 5) * 300,
      delay: (index % 7) * 120,
      useNativeDriver: true,
    }).start();
  }, [fall, index]);

  const translateY = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, height * 0.9],
  });
  const rotate = fall.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", `${540 + (index % 4) * 180}deg`],
  });
  const opacity = fall.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 1, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.confetti,
        {
          left: `${(index * 61) % 96}%`,
          backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
          transform: [{ translateY }, { rotate }],
          opacity,
        },
      ]}
    />
  );
}

export default function ResultScreen({ isCorrect }) {
  const v = VARIANTS[isCorrect ? "correct" : "incorrect"];
  const { height } = useWindowDimensions();
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [pop]);

  const share = () =>
    Share.share({
      message: isCorrect
        ? "I just aced today's mission on Launch Your Career and my streak hit 8 days! Think you can beat me?"
        : "Grinding daily missions on Launch Your Career — come climb the leaderboard with me!",
    });

  return (
    <LinearGradient colors={v.gradient} style={styles.gradient}>
      {isCorrect &&
        Array.from({ length: 22 }, (_, i) => (
          <ConfettiPiece key={i} index={i} height={height} />
        ))}

      <SafeAreaView style={styles.container}>
        <View style={styles.body}>
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <Ionicons name={v.icon} size={140} color={COLORS.white} />
          </Animated.View>
          <Text style={styles.title}>{v.title}</Text>
          <Text style={styles.subtitle}>{v.subtitle}</Text>

          <View style={styles.chip}>
            <Ionicons name={v.chipIcon} size={22} color={COLORS.ink} />
            <Text style={styles.chipText}>{v.chip}</Text>
          </View>

          {isCorrect && (
            <View style={styles.streakRow}>
              <Ionicons name="flame" size={20} color={COLORS.gold} />
              <Text style={styles.streakText}>Streak 7</Text>
              <Ionicons
                name="arrow-forward"
                size={16}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={[styles.streakText, styles.streakNew]}>8</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <PressableScale style={styles.shareButton} onPress={share}>
            <Ionicons name="share-social" size={20} color={COLORS.white} />
            <Text style={styles.shareText}>Share</Text>
          </PressableScale>

          <PressableScale
            style={styles.continueButton}
            onPress={() => router.replace("/(tabs)/home")}
          >
            <Text style={styles.continueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={22} color={COLORS.ink} />
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
  confetti: {
    position: "absolute",
    top: 0,
    width: 12,
    height: 12,
    borderRadius: 3,
    zIndex: 10,
    elevation: 10,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: COLORS.white,
    fontSize: 44,
    fontFamily: FONTS.heading,
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
    fontFamily: FONTS.heading,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
  },
  streakText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "800",
  },
  streakNew: {
    color: COLORS.gold,
    fontSize: 22,
    fontFamily: FONTS.heading,
  },
  actions: {
    gap: 12,
    marginBottom: 28,
  },
  shareButton: {
    height: 50,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    backgroundColor: "rgba(255,255,255,0.15)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  shareText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "800",
  },
  continueButton: {
    height: 58,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    ...clay("#000", 6),
  },
  continueText: {
    color: COLORS.ink,
    fontSize: 20,
    fontFamily: FONTS.heading,
  },
});
