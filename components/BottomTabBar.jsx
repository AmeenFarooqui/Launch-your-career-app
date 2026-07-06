import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "../constants/theme";

const TABS = [
  { name: "home", icon: "home", label: "Home" },
  { name: "leaderboard", icon: "trophy", label: "Rank" },
  { name: "store", icon: "storefront", label: "Store" },
  { name: "profile", icon: "person", label: "Profile" },
];

// Springs the pill in whenever this tab becomes active.
function TabItem({ tab, isActive, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      scale.setValue(0.7);
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 90,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, scale]);

  return (
    <Pressable
      style={styles.navTab}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View
        style={[
          styles.tabPill,
          isActive && styles.tabPillActive,
          { transform: [{ scale }] },
        ]}
      >
        <Ionicons
          name={isActive ? tab.icon : `${tab.icon}-outline`}
          size={24}
          color={isActive ? COLORS.white : COLORS.lavender}
        />
        <Text style={isActive ? styles.activeLabel : styles.navLabel}>
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function BottomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
      {TABS.map((tab) => (
        <TabItem
          key={tab.name}
          tab={tab}
          isActive={state.routes[state.index].name === tab.name}
          onPress={() => navigation.navigate(tab.name)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    backgroundColor: COLORS.night,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
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
    color: COLORS.lavender,
    fontWeight: "700",
    fontSize: 12,
  },
});
