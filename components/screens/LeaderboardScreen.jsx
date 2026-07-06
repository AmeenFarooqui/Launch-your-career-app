import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import PressableScale from "../PressableScale";
import Screen from "../Screen";
import { FadeInUp, Float } from "../motion";
import { COLORS, RADIUS, FONTS, TYPE, clay } from "../../constants/theme";

// Podium cards wobble when tapped.
function WobbleCard({ style, children }) {
  const wob = useRef(new Animated.Value(0)).current;

  const wobble = () => {
    wob.setValue(0);
    Animated.timing(wob, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const rotate = wob.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: ["0deg", "-8deg", "7deg", "-5deg", "3deg", "0deg"],
  });

  return (
    <Pressable onPress={wobble}>
      <Animated.View style={[style, { transform: [{ rotate }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const FILTERS = ["My State", "My City", "My School"];

const PODIUM = [
  { medal: "#C0C0C0", place: 2, name: "Maya R.", school: "Hersey High", streak: 20, xp: 2000, style: "silver", delay: 130 },
  { medal: "#FFD700", place: 1, name: "Jordan T.", school: "Prospect High", streak: 30, xp: 3200, style: "gold", delay: 0 },
  { medal: "#CD7F32", place: 3, name: "Sam K.", school: "Conant High", streak: 15, xp: 1000, style: "bronze", delay: 220 },
];

// delta: rank places moved since yesterday (+ = climbed).
const ROWS = [
  { rank: 4, name: "Priya N.", school: "Palatine High", streak: 10, xp: 860, pts: 380, delta: 2 },
  { rank: 5, name: "Devon P.", school: "Wheeling High", streak: 12, xp: 810, pts: 365, delta: -1 },
  { rank: 6, name: "Lena W.", school: "Elk Grove High", streak: 6, xp: 700, pts: 340, delta: 0 },
  { rank: 7, name: "Omar S.", school: "Buffalo Grove High", streak: 9, xp: 655, pts: 320, delta: 1 },
];

function RankDelta({ delta }) {
  if (delta === 0) {
    return <Ionicons name="remove" size={16} color={COLORS.lavender} />;
  }
  const up = delta > 0;
  const color = up ? COLORS.green : "#FF6B6B";
  return (
    <View style={styles.deltaRow}>
      <Ionicons name={up ? "caret-up" : "caret-down"} size={14} color={color} />
      <Text style={[styles.deltaText, { color }]}>{Math.abs(delta)}</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const [activeFilter, setActiveFilter] = useState(0);

  return (
    <Screen>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Leaderboard</Text>

          <View style={styles.filterContainer}>
            {FILTERS.map((label, i) => (
              <PressableScale
                key={label}
                style={[
                  styles.filterBtn,
                  i === activeFilter && styles.filterBtnActive,
                ]}
                onPress={() => setActiveFilter(i)}
              >
                <Text style={styles.filterText}>{label}</Text>
              </PressableScale>
            ))}
          </View>
        </View>

        {/* Podium */}
        <View style={styles.podiumRow}>
          {PODIUM.map((p) => (
            <FadeInUp key={p.place} delay={p.delay}>
            <WobbleCard style={[styles.podiumCard, styles[p.style]]}>
              {p.place === 1 && (
                <Float range={5} duration={1500} style={styles.crown}>
                  <MaterialCommunityIcons
                    name="crown"
                    size={40}
                    color={COLORS.goldDark}
                    style={{ transform: [{ rotate: "8deg" }] }}
                  />
                </Float>
              )}
              <Ionicons name="medal" size={34} color={p.medal} />
              <View style={styles.avatar}>
                <Ionicons name="person" size={30} color={COLORS.purpleLight} />
              </View>
              <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.school} numberOfLines={1}>{p.school}</Text>

              <View style={styles.statRow}>
                <Ionicons name="flame" size={14} color={COLORS.red} />
                <Text style={styles.stat}>{p.streak} Day Streak</Text>
              </View>
              <View style={styles.statRow}>
                <Ionicons name="diamond" size={14} color={COLORS.purpleLight} />
                <Text style={styles.stat}>{p.xp} XP</Text>
              </View>
            </WobbleCard>
            </FadeInUp>
          ))}
        </View>

        {/* Rankings */}
        <View style={styles.rankContainer}>
          {ROWS.map((row, i) => (
            <FadeInUp key={row.rank} delay={280 + i * 80}>
            <View style={styles.rankRow}>
              <Text style={styles.rankNumber}>{row.rank}</Text>
              <RankDelta delta={row.delta} />

              <View style={styles.smallAvatar}>
                <Ionicons name="person" size={22} color={COLORS.white} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.rankName} numberOfLines={1}>{row.name}</Text>
                <Text style={[styles.school, styles.schoolDark]} numberOfLines={1}>
                  {row.school}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Ionicons name="flame" size={14} color={COLORS.gold} />
                <Text style={[styles.stat, styles.statDark]}>{row.streak}</Text>
              </View>
              <View style={styles.statRow}>
                <Ionicons name="diamond" size={14} color={COLORS.purpleSoft} />
                <Text style={[styles.stat, styles.statDark]}>{row.xp}</Text>
              </View>

              <Text style={styles.points}>{row.pts} pts</Text>
            </View>
            </FadeInUp>
          ))}
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <View>
            <Text style={styles.userRank}>#21 Alexandrina B.</Text>
            <Text style={styles.userCity}>Mount Prospect, IL</Text>
          </View>

          <Text style={styles.userPoints}>60 pts</Text>
        </View>

        <PressableScale onPress={() => {}}>
          <Text style={styles.fullBoard}>View Full Leaderboard</Text>
        </PressableScale>

        {/* Bottom Cards */}
        <View style={styles.statsRow}>
          <View style={styles.redCard}>
            <Ionicons name="flame" size={44} color={COLORS.gold} />
            <View style={styles.redCardBody}>
              <Text style={styles.bigNumber}>8</Text>
              <Text style={styles.white}>Day Streak</Text>
              <Text style={styles.white}>x0.2</Text>
            </View>
          </View>

          <View style={styles.redCard}>
            <Text style={styles.bigNumber}>5</Text>
            <View style={styles.redCardBody}>
              <Text style={styles.white}>to beat</Text>
              <Text style={styles.whiteBold}>Amy D.</Text>
              <Text style={styles.white}>(#20)</Text>
            </View>
          </View>
        </View>
        </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingTop: 18,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },

  title: {
    color: COLORS.white,
    fontSize: TYPE.h1,
    fontFamily: FONTS.heading,
    marginBottom: 20,
  },

  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  filterBtn: {
    flex: 1,
    backgroundColor: "#5E31E6",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: RADIUS.md,
  },

  filterBtnActive: {
    backgroundColor: COLORS.purpleDark,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
  },

  filterText: {
    color: COLORS.white,
    fontWeight: "800",
  },

  podiumRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    marginTop: 40,
    paddingHorizontal: 10,
  },

  podiumCard: {
    width: 112,
    borderRadius: RADIUS.lg,
    padding: 12,
    alignItems: "center",
    ...clay("#000", 5),
  },

  silver: {
    backgroundColor: "#E8E8E8",
  },

  gold: {
    backgroundColor: COLORS.gold,
    marginTop: -22,
  },

  crown: {
    position: "absolute",
    top: -30,
    transform: [{ rotate: "8deg" }],
  },

  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  deltaText: {
    fontSize: TYPE.caption,
    fontWeight: "800",
  },

  bronze: {
    backgroundColor: "#FFC48A",
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },

  name: {
    fontWeight: "800",
    fontSize: TYPE.body,
    color: COLORS.ink,
    maxWidth: 96,
  },

  school: {
    color: COLORS.muted,
    fontSize: TYPE.caption,
  },

  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },

  stat: {
    fontSize: TYPE.caption,
    color: COLORS.ink,
    fontWeight: "600",
  },

  rankContainer: {
    margin: 20,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },

  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    gap: 8,
  },

  rankNumber: {
    fontSize: TYPE.h2,
    fontFamily: FONTS.heading,
    width: 32,
    color: COLORS.white,
  },

  smallAvatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: COLORS.purpleLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },

  rankName: {
    fontWeight: "800",
    color: COLORS.white,
  },

  schoolDark: {
    color: COLORS.lavender,
  },

  statDark: {
    color: COLORS.white,
  },

  points: {
    fontFamily: FONTS.heading,
    marginLeft: 6,
    color: COLORS.gold,
  },

  userCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 20,
    borderRadius: RADIUS.lg,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  userRank: {
    color: COLORS.gold,
    fontSize: TYPE.h2,
    fontFamily: FONTS.heading,
  },

  userCity: {
    color: COLORS.lavender,
    marginTop: 2,
  },

  userPoints: {
    color: COLORS.white,
    fontFamily: FONTS.heading,
    fontSize: TYPE.h1,
  },

  fullBoard: {
    color: COLORS.lavender,
    textAlign: "center",
    fontSize: TYPE.body,
    fontFamily: FONTS.heading,
    marginVertical: 20,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 40,
    gap: 12,
  },

  redCard: {
    backgroundColor: COLORS.red,
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...clay(COLORS.red, 5),
  },

  redCardBody: {
    flexShrink: 1,
  },

  bigNumber: {
    fontSize: TYPE.h1,
    fontFamily: FONTS.heading,
    color: COLORS.white,
  },

  white: {
    color: COLORS.white,
  },

  whiteBold: {
    color: COLORS.white,
    fontWeight: "800",
  },
});
