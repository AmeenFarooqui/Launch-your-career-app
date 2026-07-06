import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Switch, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import PressableScale from "../PressableScale";
import Screen from "../Screen";
import { FadeInUp } from "../motion";
import { COLORS, RADIUS, FONTS, TYPE, clay } from "../../constants/theme";

function confirmDelete() {
  Alert.alert(
    "Delete Account",
    "This permanently erases your points, streak, and badges. There's no undo.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive" },
    ]
  );
}

export default function SettingsScreen() {
  const [reminders, setReminders] = useState(true);
  const [visible, setVisible] = useState(true);

  return (
    <Screen>
      <View style={styles.header}>
        <PressableScale style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={COLORS.purple} />
        </PressableScale>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Account */}
        <FadeInUp>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="person" size={20} color={COLORS.purple} />
            <Text style={styles.rowLabel}>Alexandrina B.</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Ionicons name="mail" size={20} color={COLORS.purple} />
            <Text style={styles.rowLabel}>rainey@example.com</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Ionicons name="school" size={20} color={COLORS.purple} />
            <Text style={styles.rowLabel}>Prospect High School</Text>
          </View>
        </View>
        </FadeInUp>

        {/* Preferences */}
        <FadeInUp delay={110}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="alarm" size={20} color={COLORS.purple} />
            <Text style={styles.rowLabel}>Daily mission reminder</Text>
            <Switch
              value={reminders}
              onValueChange={setReminders}
              trackColor={{ true: COLORS.purple, false: COLORS.line }}
              thumbColor={COLORS.white}
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Ionicons name="trophy" size={20} color={COLORS.purple} />
            <Text style={styles.rowLabel}>Show me on leaderboards</Text>
            <Switch
              value={visible}
              onValueChange={setVisible}
              trackColor={{ true: COLORS.purple, false: COLORS.line }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>
        </FadeInUp>

        {/* Session */}
        <FadeInUp delay={220}>
          <PressableScale
            style={styles.logoutButton}
            onPress={() => router.replace("/(auth)/start")}
          >
            <Ionicons name="log-out" size={22} color={COLORS.white} />
            <Text style={styles.logoutText}>Log Out</Text>
          </PressableScale>

          <PressableScale style={styles.deleteButton} onPress={confirmDelete}>
            <Text style={styles.deleteText}>Delete Account</Text>
          </PressableScale>

          <Text style={styles.version}>Launch Your Career v1.0.0</Text>
        </FadeInUp>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    ...clay(COLORS.purpleDark, 4),
  },

  headerTitle: {
    fontSize: TYPE.h2,
    color: COLORS.white,
    fontFamily: FONTS.heading,
  },

  scroll: {
    padding: 16,
    paddingBottom: 40,
  },

  sectionTitle: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: COLORS.lavender,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 4,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    ...clay("#000", 4),
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },

  rowLabel: {
    flex: 1,
    fontSize: TYPE.body,
    fontWeight: "600",
    color: COLORS.ink,
  },

  separator: {
    height: 1,
    backgroundColor: COLORS.line,
  },

  logoutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    height: 56,
    backgroundColor: COLORS.red,
    borderRadius: RADIUS.lg,
    marginTop: 32,
    ...clay(COLORS.red, 5),
  },

  logoutText: {
    color: COLORS.white,
    fontFamily: FONTS.heading,
    fontSize: TYPE.h2,
  },

  deleteButton: {
    alignItems: "center",
    paddingVertical: 18,
  },

  deleteText: {
    color: COLORS.lavender,
    fontWeight: "700",
    fontSize: TYPE.caption,
    textDecorationLine: "underline",
  },

  version: {
    textAlign: "center",
    color: COLORS.lavender,
    fontSize: TYPE.caption,
    marginTop: 6,
  },
});
