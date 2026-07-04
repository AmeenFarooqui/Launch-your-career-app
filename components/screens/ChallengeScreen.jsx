import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function ChallengeScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.header} />

      <Text style={styles.challengeText}>Challenge #08</Text>
      <Text style={styles.pointsText}>10 pts</Text>

      <View style={styles.timerBox}>
        <Text style={styles.timerText}>00:14</Text>
      </View>

      <View style={styles.questionBox}>
        <Text style={styles.questionText}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce
          convallis pellentesque metu
        </Text>
      </View>

      <Answer top={340} roundedTop text="Blah blah bleh blah\nblah blah bleh blah." />
      <Answer top={442} text="Blah blah bleh blah\nblah blah bleh blah but longer." />
      <Answer top={545} text="Blah blah bleh blah\nblah blah bleh blah and correct." />
      <Answer top={648} roundedBottom text="Blah blah bleh blah\nblah blah bleh blah." />
    </View>
  );
}

function Answer({ top, text, roundedTop, roundedBottom }) {
  return (
    <>
      <TouchableOpacity
        style={[
          styles.answerBox,
          { top },
          roundedTop && styles.roundedTop,
          roundedBottom && styles.roundedBottom,
        ]}
      >
        <Text style={styles.answerText}>{text}</Text>
      </TouchableOpacity>

      <View style={[styles.circle, { top: top + 36 }]} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: 393,
    height: 852,
    backgroundColor: "rgba(0,0,0,0.93)",
    position: "relative",
  },

  header: {
    position: "absolute",
    left: 0,
    top: -12,
    width: 393,
    height: 92,
    backgroundColor: "rgba(95,2,176,1)",
    borderRadius: 20,
  },

  challengeText: {
    position: "absolute",
    left: 15,
    top: 11,
    width: 160,
    height: 50,
    color: "#FFFFFF",
    fontSize: 21,
    fontStyle: "italic",
    fontFamily: "Verdana",
    textAlign: "center",
  },

  pointsText: {
    position: "absolute",
    left: 255,
    top: 5,
    width: 138,
    height: 46,
    color: "rgba(254,239,0,1)",
    fontSize: 36,
    fontWeight: "700",
    textAlign: "center",
  },

  timerBox: {
    position: "absolute",
    left: 86,
    top: 51,
    width: 220,
    height: 89,
    backgroundColor: "rgba(136,0,222,1)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  timerText: {
    color: "rgba(89,238,80,1)",
    fontSize: 55,
    fontWeight: "700",
    fontFamily: "Verdana",
  },

  questionBox: {
    position: "absolute",
    left: 12,
    top: 149,
    width: 369,
    height: 168,
    borderRadius: 20,
    backgroundColor: "rgba(80,80,80,1)",
  },

  questionText: {
    position: "absolute",
    left: 30,
    top: 0,
    width: 309,
    height: 145,
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 29,
    textAlign: "center",
  },

  answerBox: {
    position: "absolute",
    left: 30,
    width: 329,
    height: 93,
    backgroundColor: "#EDEDED",
    justifyContent: "center",
    alignItems: "center",
  },

  roundedTop: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  roundedBottom: {
    left: 32,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  answerText: {
    color: "#000000",
    fontSize: 23,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 28,
  },

  circle: {
    position: "absolute",
    left: 42,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});
