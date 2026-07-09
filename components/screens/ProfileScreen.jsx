import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import PressableScale from "../PressableScale";
import Screen from "../Screen";
import { FadeInUp, Float, Pulse } from "../motion";
import { COLORS, RADIUS, FONTS, TYPE, clay } from "../../constants/theme";

const STATS = [
  { icon: "star", label: "Points", value: "60", color: COLORS.goldDark },
  { icon: "diamond", label: "Diamonds", value: "860", color: COLORS.blue },
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
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Identity card */}
        <FadeInUp style={styles.identityShadow}>
        <LinearGradient
          colors={[COLORS.purple, COLORS.purpleDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.identityCard}
        >
          <View pointerEvents="none" style={styles.identityCircleBig} />
          <View pointerEvents="none" style={styles.identityCircleSmall} />

          <Float range={5}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>AB</Text>
            </View>
          </Float>
          <Text style={styles.name}>Alexandrina B.</Text>
          <Text style={styles.school}>Prospect High School • Mount Prospect, IL</Text>
        </LinearGradient>
        </FadeInUp>

        {/* Stats */}
        <View style={styles.statsRow}>
          {STATS.map((s, i) => (
            <FadeInUp key={s.label} delay={100 + i * 70} style={styles.statCard}>
              {s.icon === "flame" ? (
                <Pulse to={1.18}>
                  <Ionicons name={s.icon} size={26} color={s.color} />
                </Pulse>
              ) : (
                <Ionicons name={s.icon} size={26} color={s.color} />
              )}
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </FadeInUp>
          ))}
        </View>

        {/* Badges */}
        <Text style={styles.sectionTitle}>Badges</Text>
        <View style={styles.badgeGrid}>
          {BADGES.map((b, i) => (
            <FadeInUp
              key={b.label}
              delay={260 + i * 60}
              style={[
                styles.badge,
                !b.earned && styles.badgeLocked,
                { transform: [{ rotate: i % 2 ? "1.4deg" : "-1.4deg" }] },
              ]}
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
            </FadeInUp>
          ))}
        </View>

        {/* Settings */}
        <FadeInUp delay={620}>
          <PressableScale
            style={styles.settingsButton}
            onPress={() => router.push("/settings")}
          >
            <Ionicons name="settings" size={22} color={COLORS.ink} />
            <Text style={styles.settingsText}>Settings</Text>
            <Ionicons name="chevron-forward" size={22} color={COLORS.muted} />
          </PressableScale>
        </FadeInUp>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identityShadow: {
    margin: 12,
    borderRadius: RADIUS.xl,
    ...clay(COLORS.purpleDark, 8),
  },

  identityCard: {
    borderRadius: RADIUS.xl,
    padding: 24,
    alignItems: "center",
    overflow: "hidden",
  },

  identityCircleBig: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -80,
    left: -60,
  },

  identityCircleSmall: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.07)",
    bottom: -40,
    right: -30,
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
    fontSize: TYPE.h1,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
  },

  name: {
    color: COLORS.white,
    fontSize: TYPE.h1,
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
    fontSize: TYPE.h2,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
  },

  statLabel: {
    fontSize: TYPE.caption,
    color: COLORS.muted,
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: TYPE.h2,
    fontFamily: FONTS.heading,
    color: COLORS.white,
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
    fontSize: TYPE.caption,
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
    fontSize: TYPE.body,
    fontWeight: "800",
    color: COLORS.ink,
  },
});
