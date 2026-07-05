import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import PressableScale from "../PressableScale";
import { COLORS, RADIUS, FONTS, clay } from "../../constants/theme";

const LETTERS = ["A", "B", "C", "D"];

const ANSWERS = [
  { text: "Blah blah bleh blah\nblah blah bleh blah.", isCorrect: false },
  {
    text: "Blah blah bleh blah\nblah blah bleh blah but longer.",
    isCorrect: false,
  },
  {
    text: "Blah blah bleh blah\nblah blah bleh blah and correct.",
    isCorrect: true,
  },
  { text: "Blah blah bleh blah\nblah blah bleh blah.", isCorrect: false },
];

// Brief pause between picking an answer and navigating, so the selection
// highlight registers before the screen changes.
const SELECT_PAUSE_MS = 350;

export default function ChallengeScreen() {
  const [selected, setSelected] = useState(null);

  const pick = (index) => {
    if (selected !== null) return; // one answer per run
    setSelected(index);
    setTimeout(() => {
      router.push({
        pathname: "/result",
        params: { correct: ANSWERS[index].isCorrect ? "1" : "0" },
      });
    }, SELECT_PAUSE_MS);
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.challengeText}>Challenge #08</Text>
          <Text style={styles.pointsText}>10 pts</Text>
        </View>

        {/* TIMER */}
        <View style={styles.timerBox}>
          <Text style={styles.timerText}>00:14</Text>
        </View>

        {/* QUESTION */}
        <View style={styles.questionBox}>
          <Text style={styles.questionText}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce
            convallis pellentesque metu
          </Text>
        </View>

        {/* ANSWERS */}
        <View style={styles.answers}>
          {ANSWERS.map((answer, i) => (
            <Answer
              key={i}
              letter={LETTERS[i]}
              text={answer.text}
              isSelected={selected === i}
              onPick={() => pick(i)}
            />
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

function Answer({ letter, text, isSelected, onPick }) {
  return (
    <PressableScale
      style={[styles.answerBox, isSelected && styles.answerBoxSelected]}
      onPress={onPick}
    >
      <View style={[styles.letterChip, isSelected && styles.letterChipSelected]}>
        <Text
          style={[styles.letterText, isSelected && styles.letterTextSelected]}
        >
          {letter}
        </Text>
      </View>
      <Text style={styles.answerText}>{text}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.93)",
  },

  safe: {
    flex: 1,
    paddingHorizontal: 16,
  },

  header: {
    backgroundColor: COLORS.purpleDark,
    borderRadius: RADIUS.lg,
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...clay(COLORS.purpleDark, 6),
  },

  challengeText: {
    color: COLORS.white,
    fontSize: 21,
    fontStyle: "italic",
    fontWeight: "700",
  },

  pointsText: {
    color: COLORS.gold,
    fontSize: 30,
    fontFamily: FONTS.heading,
  },

  timerBox: {
    alignSelf: "center",
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 42,
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.lg,
    ...clay(COLORS.purpleDark, 6),
  },

  timerText: {
    color: COLORS.green,
    fontSize: 50,
    fontFamily: FONTS.heading,
    fontVariant: ["tabular-nums"],
  },

  questionBox: {
    marginTop: 18,
    borderRadius: RADIUS.lg,
    backgroundColor: "rgba(80,80,80,1)",
    padding: 22,
    minHeight: 140,
    justifyContent: "center",
  },

  questionText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 29,
    textAlign: "center",
  },

  answers: {
    flex: 1,
    marginTop: 20,
    marginBottom: 8,
    gap: 10,
    justifyContent: "flex-end",
  },

  answerBox: {
    minHeight: 88,
    backgroundColor: "#EDEDED",
    borderRadius: RADIUS.lg,
    borderWidth: 3,
    borderColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 14,
    ...clay("#000", 4),
  },

  answerBoxSelected: {
    borderColor: COLORS.purple,
    backgroundColor: "#F3E6FF",
  },

  letterChip: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },

  letterChipSelected: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.purple,
  },

  letterText: {
    fontSize: 18,
    fontFamily: FONTS.heading,
    color: "rgba(0,0,0,0.6)",
  },

  letterTextSelected: {
    color: COLORS.white,
  },

  answerText: {
    flex: 1,
    color: "#000",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
    textAlign: "center",
  },
});
