import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import PressableScale from "../PressableScale";
import Screen from "../Screen";
import { FadeInUp, Pulse } from "../motion";
import { COLORS, RADIUS, FONTS, clay } from "../../constants/theme";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

// Time until midnight, when the next daily mission drops.
function getTimeLeft() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const total = Math.max(0, Math.floor((midnight - now) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export default function HomeScreen() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const tick = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 900,
      useNativeDriver: false, // width animation
    }).start();
  }, [progress]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <FadeInUp style={styles.headerShadow}>
        <LinearGradient
          colors={[COLORS.purple, COLORS.purpleDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View pointerEvents="none" style={styles.headerCircleBig} />
          <View pointerEvents="none" style={styles.headerCircleSmall} />

          <View style={styles.headerText}>
            <Text style={styles.goodMorning}>{getGreeting()}</Text>
            <Text
              style={styles.username}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Alexandrina
            </Text>
          </View>

          <View style={styles.streakCard}>
            <Pulse to={1.18}>
              <Ionicons name="flame" size={30} color={COLORS.red} />
            </Pulse>
            <Text style={styles.streakDays}>7 Days</Text>
          </View>
        </LinearGradient>
        </FadeInUp>

        {/* MISSION CARD */}
        <FadeInUp delay={100}>
        <View style={styles.missionOuter}>
          <View style={styles.missionInner}>
            <Text style={styles.missionTitle}>Today's Mission</Text>

            <Text style={styles.question}>
              Which planet is known as the Red Planet?
            </Text>

            <View style={styles.countdownRow}>
              <Ionicons name="alarm" size={18} color={COLORS.white} />
              <Text style={[styles.countdown, styles.countdownDigits]}>
                Ends in {timeLeft}
              </Text>
            </View>

            <PressableScale
              style={styles.startButton}
              onPress={() => router.push("/challenge")}
            >
              <Text style={styles.startText}>Start Mission</Text>
              <Pulse to={1.2}>
                <Ionicons name="flame" size={30} color={COLORS.red} />
              </Pulse>
            </PressableScale>
          </View>
        </View>
        </FadeInUp>

        {/* RANKING CARD */}
        <FadeInUp delay={200}>
        <View style={styles.rankCard}>
          <Text style={styles.rankTitle}>Your Ranking</Text>

          <View style={styles.rankRow}>
            <Text style={styles.rankNumber}>#22</Text>

            <View>
              <Text style={styles.rankInfo}>in the state • 50 pts</Text>
            </View>
          </View>

          <View style={styles.progressBackground}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "72%"],
                  }),
                },
              ]}
            />
          </View>

          <Text style={styles.rankMessage}>15 pts away from Top 20</Text>
        </View>
        </FadeInUp>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerShadow: {
    margin: 12,
    borderRadius: RADIUS.xl,
    ...clay(COLORS.purpleDark, 8),
  },

  header: {
    padding: 20,
    borderRadius: RADIUS.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
  },

  headerCircleBig: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -70,
    right: -40,
  },

  headerCircleSmall: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.07)",
    bottom: -30,
    left: -20,
  },

  headerText: {
    flex: 1,
    marginRight: 12,
  },

  goodMorning: {
    color: COLORS.gold,
    fontSize: 24,
    fontStyle: "italic",
    fontWeight: "600",
  },

  username: {
    color: COLORS.white,
    fontSize: 52,
    fontFamily: FONTS.heading,
  },

  streakCard: {
    width: 108,
    height: 108,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.xl,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    ...clay(COLORS.goldDark, 5),
  },

  streakDays: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.ink,
  },

  missionOuter: {
    backgroundColor: COLORS.greenDark,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: RADIUS.xl,
    padding: 14,
    ...clay(COLORS.greenDark, 8),
  },

  missionInner: {
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.lg,
    padding: 20,
  },

  missionTitle: {
    color: COLORS.white,
    fontSize: 34,
    fontFamily: FONTS.heading,
    textAlign: "center",
    marginBottom: 15,
  },

  question: {
    color: COLORS.white,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "600",
  },

  countdownRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },

  countdownDigits: {
    fontVariant: ["tabular-nums"],
  },

  countdown: {
    color: COLORS.white,
    fontWeight: "700",
  },

  startButton: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.lg,
    paddingVertical: 18,
    paddingHorizontal: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...clay(COLORS.goldDark, 5),
  },

  startText: {
    fontSize: 24,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
  },

  rankCard: {
    backgroundColor: COLORS.pink,
    marginHorizontal: 20,
    marginVertical: 25,
    borderRadius: RADIUS.xl,
    padding: 20,
    ...clay(COLORS.pink, 8),
  },

  rankTitle: {
    color: COLORS.white,
    textAlign: "center",
    fontSize: 28,
    fontFamily: FONTS.heading,
    marginBottom: 10,
  },

  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  rankNumber: {
    color: COLORS.white,
    fontSize: 72,
    fontFamily: FONTS.heading,
    marginRight: 15,
  },

  rankInfo: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "700",
  },

  progressBackground: {
    backgroundColor: "rgba(255,255,255,0.35)",
    height: 24,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    marginBottom: 10,
  },

  progressFill: {
    width: "72%",
    height: "100%",
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.lg,
  },

  rankMessage: {
    textAlign: "center",
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 18,
  },
});
