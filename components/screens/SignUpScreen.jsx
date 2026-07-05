import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import PressableScale from "../PressableScale";
import { COLORS, RADIUS, clay } from "../../constants/theme";

export default function SignUpScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <PressableScale style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={COLORS.purple} />
        </PressableScale>
        <Text style={styles.headerTitle}>Join the mission</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Alexandrina Bartholomew"
            placeholderTextColor={COLORS.muted}
          />

          <Text style={styles.label}>School</Text>
          <TextInput
            style={styles.input}
            placeholder="Prospect High School"
            placeholderTextColor={COLORS.muted}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={COLORS.muted}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={COLORS.muted}
            secureTextEntry
          />

          <PressableScale
            style={styles.submitButton}
            onPress={() => router.replace("/(tabs)/home")}
          >
            <Text style={styles.submitText}>Create Account</Text>
            <Ionicons name="rocket" size={20} color={COLORS.ink} />
          </PressableScale>

          <View style={styles.divider} />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.linkText}>log in here</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
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
    fontSize: 26,
    color: COLORS.purple,
    fontWeight: "900",
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 24,
    ...clay(COLORS.purpleDark, 10),
  },
  label: {
    fontWeight: "800",
    color: COLORS.ink,
    marginTop: 12,
    marginBottom: 8,
    fontSize: 15,
  },
  input: {
    height: 52,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bg,
    fontSize: 16,
    color: COLORS.ink,
    marginBottom: 6,
  },
  submitButton: {
    height: 56,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.lg,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 22,
    ...clay(COLORS.goldDark, 6),
  },
  submitText: {
    color: COLORS.ink,
    fontWeight: "900",
    fontSize: 19,
  },
  divider: {
    height: 2,
    backgroundColor: COLORS.line,
    marginVertical: 20,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.purple,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
