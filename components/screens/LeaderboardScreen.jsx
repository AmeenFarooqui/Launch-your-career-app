import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "../PressableScale";
import { COLORS, RADIUS, clay } from "../../constants/theme";

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
  { medal: "#C0C0C0", place: 2, streak: 20, xp: 2000, style: "silver" },
  { medal: "#FFD700", place: 1, streak: 30, xp: 3200, style: "gold" },
  { medal: "#CD7F32", place: 3, streak: 15, xp: 1000, style: "bronze" },
];

export default function LeaderboardScreen() {
  const [activeFilter, setActiveFilter] = useState(0);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <LinearGradient
        colors={[COLORS.purpleLight, "#E9E1FA"]}
        style={styles.gradient}
      >
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
            <WobbleCard
              key={p.place}
              style={[styles.podiumCard, styles[p.style]]}
            >
              <Ionicons name="medal" size={34} color={p.medal} />
              <View style={styles.avatar}>
                <Ionicons name="person" size={30} color={COLORS.purpleLight} />
              </View>
              <Text style={styles.name}>Full Name</Text>
              <Text style={styles.school}>School</Text>

              <View style={styles.statRow}>
                <Ionicons name="flame" size={14} color={COLORS.red} />
                <Text style={styles.stat}>{p.streak} Day Streak</Text>
              </View>
              <View style={styles.statRow}>
                <Ionicons name="diamond" size={14} color={COLORS.purpleLight} />
                <Text style={styles.stat}>{p.xp} XP</Text>
              </View>
            </WobbleCard>
          ))}
        </View>

        {/* Rankings */}
        <View style={styles.rankContainer}>
          {[4, 5, 6, 7].map((rank) => (
            <View key={rank} style={styles.rankRow}>
              <Text style={styles.rankNumber}>{rank}</Text>

              <View style={styles.smallAvatar}>
                <Ionicons name="person" size={22} color={COLORS.white} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.rankName}>Full Name</Text>
                <Text style={styles.school}>School</Text>
              </View>

              <View style={styles.statRow}>
                <Ionicons name="flame" size={14} color={COLORS.red} />
                <Text style={styles.stat}>10</Text>
              </View>
              <View style={styles.statRow}>
                <Ionicons name="diamond" size={14} color={COLORS.purpleLight} />
                <Text style={styles.stat}>860</Text>
              </View>

              <Text style={styles.points}>380 pts</Text>
            </View>
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
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.purpleLight,
  },

  gradient: {
    flex: 1,
  },

  container: {
    flex: 1,
  },

  header: {
    backgroundColor: COLORS.purpleLight,
    paddingTop: 18,
    paddingBottom: 35,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },

  title: {
    color: COLORS.white,
    fontSize: 40,
    fontWeight: "900",
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
    marginTop: 25,
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
    marginTop: -12,
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
    fontSize: 15,
    color: COLORS.ink,
  },

  school: {
    color: COLORS.muted,
    fontSize: 13,
  },

  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },

  stat: {
    fontSize: 13,
    color: COLORS.ink,
    fontWeight: "600",
  },

  rankContainer: {
    margin: 20,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.75)",
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
    fontSize: 26,
    fontWeight: "900",
    width: 32,
    color: COLORS.ink,
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
    color: COLORS.ink,
  },

  points: {
    fontWeight: "900",
    marginLeft: 6,
    color: COLORS.purpleLight,
  },

  userCard: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.85)",
    marginHorizontal: 20,
    borderRadius: RADIUS.lg,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  userRank: {
    color: COLORS.red,
    fontSize: 24,
    fontWeight: "900",
  },

  userCity: {
    color: COLORS.ink,
    marginTop: 2,
  },

  userPoints: {
    color: COLORS.purpleLight,
    fontWeight: "900",
    fontSize: 34,
  },

  fullBoard: {
    color: COLORS.purpleDark,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "900",
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
    fontSize: 38,
    fontWeight: "900",
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
