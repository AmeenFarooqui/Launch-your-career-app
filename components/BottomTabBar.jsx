import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "../constants/theme";

const TABS = [
  { name: "home", icon: "home", label: "Home" },
  { name: "leaderboard", icon: "trophy", label: "Rank" },
  { name: "store", icon: "storefront", label: "Store" },
  { name: "profile", icon: "person", label: "Profile" },
];

export default function BottomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
      {TABS.map((tab) => {
        const isActive = state.routes[state.index].name === tab.name;
        return (
          <Pressable
            key={tab.name}
            style={styles.navTab}
            onPress={() => navigation.navigate(tab.name)}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
          >
            <View style={[styles.tabPill, isActive && styles.tabPillActive]}>
              <Ionicons
                name={isActive ? tab.icon : `${tab.icon}-outline`}
                size={24}
                color={isActive ? COLORS.white : COLORS.muted}
              />
              <Text style={isActive ? styles.activeLabel : styles.navLabel}>
                {tab.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  navTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  tabPill: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: RADIUS.lg,
    gap: 2,
    minWidth: 76,
  },
  tabPillActive: {
    backgroundColor: COLORS.purple,
  },
  activeLabel: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 12,
  },
  navLabel: {
    color: COLORS.muted,
    fontWeight: "700",
    fontSize: 12,
  },
});
