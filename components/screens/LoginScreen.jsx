import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import PressableScale from "../PressableScale";
import Screen from "../Screen";
import { FadeInUp } from "../motion";
import { COLORS, RADIUS, FONTS, TYPE, clay } from "../../constants/theme";

// Original screen designed via human; Copr. John Sencion 2026.
// Restyled to the app-wide clay visual language per the 2026-07-04 design spec.
export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Screen>
      <View style={styles.header}>
        <PressableScale style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={COLORS.purple} />
        </PressableScale>
        <Text style={styles.headerTitle}>Welcome back</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.mainContent}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FadeInUp delay={80}>
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="rainey@example.com"
            placeholderTextColor={COLORS.muted}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.passwordHeader}>
            <Text style={styles.label}>Password</Text>
            <Pressable hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>
          </View>

          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="••••••••"
              placeholderTextColor={COLORS.muted}
              secureTextEntry={!showPassword}
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={22}
                color={COLORS.purple}
              />
            </Pressable>
          </View>

          <PressableScale
            style={styles.loginButton}
            onPress={() => router.replace("/(tabs)/home")}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </PressableScale>

          <View style={styles.divider} />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account yet? then </Text>
            <Pressable onPress={() => router.push("/(auth)/signup")}>
              <Text style={styles.linkText}>make one here</Text>
            </Pressable>
            <Text style={styles.footerText}>!</Text>
          </View>
        </View>
        </FadeInUp>
      </KeyboardAvoidingView>
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
  mainContent: {
    flex: 1,
    padding: 20,
    paddingTop: 36,
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
  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  forgotText: {
    color: COLORS.goldDark,
    fontWeight: "800",
    fontStyle: "italic",
    marginBottom: 8,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    paddingRight: 52,
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    height: 52,
    justifyContent: "center",
  },
  loginButton: {
    height: 56,
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    ...clay(COLORS.greenDark, 6),
  },
  loginButtonText: {
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
    flexWrap: "wrap",
    justifyContent: "center",
  },
  footerText: {
    fontSize: TYPE.caption,
    color: COLORS.muted, // inside the white card
  },
  linkText: {
    fontSize: TYPE.caption,
    color: COLORS.purple,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
