import React from "react";
import { useLocalSearchParams } from "expo-router";
import CorrectScreen from "../components/screens/CorrectScreen";
import IncorrectScreen from "../components/screens/IncorrectScreen";

export default function Result() {
  const { correct } = useLocalSearchParams();
  return correct === "1" ? <CorrectScreen /> : <IncorrectScreen />;
}
