import React from "react";
import { useLocalSearchParams } from "expo-router";
import ResultScreen from "../components/screens/ResultScreen";

export default function Result() {
  const { correct } = useLocalSearchParams();
  return <ResultScreen isCorrect={correct === "1"} />;
}
