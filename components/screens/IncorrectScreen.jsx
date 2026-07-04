import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function IncorrectScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Incorrect</Text>
      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => router.replace("/(tabs)/home")}
      >
        <Text style={styles.continueText}>Continue</Text>
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
  continueButton: {
    marginTop: 24,
    backgroundColor: "#8A00E6",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  continueText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
