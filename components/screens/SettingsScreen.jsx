import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function SettingsScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Settings Screen</Text>
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => router.replace("/(auth)/start")}
      >
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 24,
  },
  logoutButton: {
    marginTop: 24,
    backgroundColor: "#D90429",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
