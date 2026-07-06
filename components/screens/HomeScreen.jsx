import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import PressableScale from "../PressableScale";
import Screen from "../Screen";
import { FadeInUp, Pulse } from "../motion";
import { COLORS, RADIUS, FONTS, TYPE, clay } from "../../constants/theme";

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
        {/* HEADER — quiet glass so the mission card owns the screen */}
        <FadeInUp>
          <View style={styles.header}>
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

            <View style={styles.streakChip}>
              <Pulse to={1.18}>
                <Ionicons name="flame" size={20} color={COLORS.gold} />
              </Pulse>
              <Text style={styles.streakDays}>7 days</Text>
            </View>
          </View>
        </FadeInUp>

        {/* MISSION CARD — the hero and the primary action */}
        <FadeInUp delay={100}>
          <View style={styles.missionOuter}>
            <View style={styles.missionInner}>
              <Text style={styles.missionTitle}>Today's Mission</Text>

              <Text style={styles.question}>
                Which planet is known as the Red Planet?
              </Text>

              <View style={styles.countdownRow}>
                <Ionicons name="alarm" size={16} color={COLORS.white} />
                <Text style={styles.countdown}>Ends in {timeLeft}</Text>
              </View>

              <PressableScale
                style={styles.startButton}
                onPress={() => router.push("/challenge")}
              >
                <Text style={styles.startText}>Start Mission</Text>
                <Pulse to={1.2}>
                  <Ionicons name="flame" size={26} color={COLORS.red} />
                </Pulse>
              </PressableScale>
            </View>
          </View>
        </FadeInUp>

        {/* RANKING CARD — quiet glass, gold stat pops */}
        <FadeInUp delay={200}>
          <View style={styles.rankCard}>
            <Text style={styles.rankTitle}>Your Ranking</Text>

            <View style={styles.rankRow}>
              <Text style={styles.rankNumber}>#22</Text>
              <Text style={styles.rankInfo}>in the state • 50 pts</Text>
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

const glass = {
  backgroundColor: "rgba(255,255,255,0.10)",
  borderWidth: 1.5,
  borderColor: "rgba(255,255,255,0.22)",
};

const styles = StyleSheet.create({
  header: {
    ...glass,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 20,
    borderRadius: RADIUS.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerText: {
    flex: 1,
    marginRight: 12,
  },

  goodMorning: {
    color: COLORS.lavender,
    fontSize: TYPE.caption,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  username: {
    color: COLORS.white,
    fontSize: TYPE.h1,
    fontFamily: FONTS.heading,
  },

  streakChip: {
    ...glass,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.lg,
  },

  streakDays: {
    fontSize: TYPE.body,
    fontFamily: FONTS.subheading,
    color: COLORS.gold,
  },

  missionOuter: {
    backgroundColor: COLORS.greenDark,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: RADIUS.xl,
    padding: 12,
    ...clay(COLORS.greenDark, 8),
  },

  missionInner: {
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.lg,
    padding: 24,
  },

  missionTitle: {
    color: COLORS.white,
    fontSize: TYPE.h1,
    fontFamily: FONTS.heading,
    textAlign: "center",
    marginBottom: 12,
  },

  question: {
    color: COLORS.white,
    fontSize: TYPE.body,
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },

  countdownRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },

  countdown: {
    color: COLORS.white,
    fontSize: TYPE.caption,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  startButton: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...clay(COLORS.goldDark, 5),
  },

  startText: {
    fontSize: TYPE.h2,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
  },

  rankCard: {
    ...glass,
    marginHorizontal: 16,
    marginVertical: 24,
    borderRadius: RADIUS.xl,
    padding: 20,
  },

  rankTitle: {
    color: COLORS.lavender,
    fontSize: TYPE.caption,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },

  rankRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
    marginBottom: 12,
  },

  rankNumber: {
    color: COLORS.gold,
    fontSize: TYPE.hero,
    fontFamily: FONTS.heading,
    fontVariant: ["tabular-nums"],
  },

  rankInfo: {
    color: COLORS.white,
    fontSize: TYPE.body,
    fontWeight: "700",
  },

  progressBackground: {
    backgroundColor: "rgba(255,255,255,0.18)",
    height: 16,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    marginBottom: 8,
  },

  progressFill: {
    height: "100%",
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.lg,
  },

  rankMessage: {
    color: COLORS.lavender,
    fontSize: TYPE.caption,
    fontWeight: "700",
  },
});
