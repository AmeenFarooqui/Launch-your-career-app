import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const PURPLE = "#8A00E6";

const TABS = [
  { name: "home", icon: "🏠", label: "Home" },
  { name: "leaderboard", icon: "🏆", label: "Rank" },
  { name: "store", icon: "🛍️", label: "Store" },
  { name: "profile", icon: "👤", label: "Profile" },
];

export default function BottomTabBar({ state, navigation }) {
  return (
    <View style={styles.bottomNav}>
      {TABS.map((tab, i) => {
        const isActive = state.index === i;
        return (
          <TouchableOpacity
            key={tab.name}
            style={isActive ? styles.activeTab : styles.navTab}
            onPress={() => navigation.navigate(tab.name)}
          >
            <Text style={styles.navIcon}>{tab.icon}</Text>
            <Text style={isActive ? styles.activeLabel : styles.navLabel}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    marginTop: "auto",
    flexDirection: "row",
    height: 75,
    backgroundColor: "#EAEAEA",
  },
  activeTab: {
    flex: 1,
    backgroundColor: PURPLE,
    justifyContent: "center",
    alignItems: "center",
  },
  navTab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  navIcon: {
    fontSize: 22,
  },
  activeLabel: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  navLabel: {
    color: "#666",
    fontWeight: "bold",
    fontSize: 16,
  },
});
