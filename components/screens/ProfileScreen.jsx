import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import PressableScale from "../PressableScale";
import { COLORS, RADIUS, FONTS, clay } from "../../constants/theme";

const STATS = [
  { icon: "star", label: "Points", value: "60", color: COLORS.goldDark },
  { icon: "diamond", label: "Diamonds", value: "860", color: COLORS.purpleLight },
  { icon: "flame", label: "Streak", value: "8", color: COLORS.red },
];

const BADGES = [
  { icon: "rocket", label: "First Mission", earned: true },
  { icon: "flame", label: "7-Day Streak", earned: true },
  { icon: "school", label: "School Top 25", earned: true },
  { icon: "trophy", label: "Top 10", earned: false },
  { icon: "diamond", label: "1k Diamonds", earned: false },
  { icon: "medal", label: "Podium Finish", earned: false },
];

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Identity card */}
        <LinearGradient
          colors={[COLORS.purple, COLORS.purpleDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.identityCard}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>AB</Text>
          </View>
          <Text style={styles.name}>Alexandrina B.</Text>
          <Text style={styles.school}>Prospect High School • Mount Prospect, IL</Text>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon} size={26} color={s.color} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Badges */}
        <Text style={styles.sectionTitle}>Badges</Text>
        <View style={styles.badgeGrid}>
          {BADGES.map((b) => (
            <View
              key={b.label}
              style={[styles.badge, !b.earned && styles.badgeLocked]}
            >
              <Ionicons
                name={b.earned ? b.icon : "lock-closed"}
                size={30}
                color={b.earned ? COLORS.purple : COLORS.muted}
              />
              <Text
                style={[styles.badgeLabel, !b.earned && styles.badgeLabelLocked]}
              >
                {b.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Settings */}
        <PressableScale
          style={styles.settingsButton}
          onPress={() => router.push("/settings")}
        >
          <Ionicons name="settings" size={22} color={COLORS.ink} />
          <Text style={styles.settingsText}>Settings</Text>
          <Ionicons name="chevron-forward" size={22} color={COLORS.muted} />
        </PressableScale>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  identityCard: {
    margin: 12,
    borderRadius: RADIUS.xl,
    padding: 24,
    alignItems: "center",
    ...clay(COLORS.purpleDark, 8),
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    ...clay(COLORS.goldDark, 4),
  },

  avatarInitials: {
    fontSize: 36,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
  },

  name: {
    color: COLORS.white,
    fontSize: 30,
    fontFamily: FONTS.heading,
  },

  school: {
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    textAlign: "center",
  },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 10,
  },

  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    alignItems: "center",
    gap: 2,
    ...clay("#000", 4),
  },

  statValue: {
    fontSize: 24,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
  },

  statLabel: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 22,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
    marginTop: 24,
    marginBottom: 12,
    marginHorizontal: 16,
  },

  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    justifyContent: "space-between",
    rowGap: 12,
  },

  badge: {
    width: "31.5%",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
    ...clay("#000", 4),
  },

  badgeLocked: {
    backgroundColor: COLORS.line,
  },

  badgeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.ink,
    textAlign: "center",
    paddingHorizontal: 4,
  },

  badgeLabelLocked: {
    color: COLORS.muted,
  },

  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.card,
    marginHorizontal: 12,
    marginVertical: 24,
    borderRadius: RADIUS.lg,
    padding: 18,
    ...clay("#000", 4),
  },

  settingsText: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.ink,
  },
});
