import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function CorrectScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Correct Screen</Text>
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
});
