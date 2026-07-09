import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import PressableScale from "../PressableScale";
import Screen from "../Screen";
import { FadeInUp } from "../motion";
import { COLORS, RADIUS, FONTS, TYPE, clay } from "../../constants/theme";

export default function SignUpScreen() {
  const [form, setForm] = useState({ name: "", school: "", email: "", password: "" });
  const [error, setError] = useState(null);

  const set = (field) => (t) => {
    setForm((f) => ({ ...f, [field]: t }));
    setError(null);
  };

  // ponytail: client-side checks only; real auth (Supabase) not wired yet
  const submit = () => {
    if (!form.name.trim()) return setError("Enter your full name.");
    if (!form.school.trim()) return setError("Enter your school.");
    if (!form.email.includes("@")) return setError("Enter a valid email address.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    router.replace("/(tabs)/home");
  };

  return (
    <Screen>
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
        <FadeInUp delay={80}>
        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Alexandrina Bartholomew"
            placeholderTextColor={COLORS.muted}
            value={form.name}
            onChangeText={set("name")}
          />

          <Text style={styles.label}>School</Text>
          <TextInput
            style={styles.input}
            placeholder="Prospect High School"
            placeholderTextColor={COLORS.muted}
            value={form.school}
            onChangeText={set("school")}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={COLORS.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={set("email")}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={COLORS.muted}
            secureTextEntry
            value={form.password}
            onChangeText={set("password")}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <PressableScale style={styles.submitButton} onPress={submit}>
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
    fontSize: TYPE.caption,
  },
  input: {
    height: 52,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bg,
    fontSize: TYPE.body,
    color: COLORS.ink,
    marginBottom: 6,
  },
  errorText: {
    color: COLORS.red,
    fontWeight: "800",
    fontSize: TYPE.caption,
    marginTop: 10,
    textAlign: "center",
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
    fontFamily: FONTS.heading,
    fontSize: TYPE.h2,
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
    fontSize: TYPE.caption,
    color: COLORS.muted,
  },
  linkText: {
    fontSize: TYPE.caption,
    color: COLORS.purple,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
