import React from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import {
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from "@expo-google-fonts/baloo-2";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
  });

  // Block until fonts load on device; render immediately under jest, where
  // font resolution is a no-op and blocking would hang every test.
  if (!fontsLoaded && !process.env.JEST_WORKER_ID) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="challenge" />
      <Stack.Screen name="result" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
