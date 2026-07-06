import React from "react";
import { View, StyleSheet } from "react-native";

// Decorative background shapes so screens aren't flat empty color.
// Render as the FIRST child of a screen container; content stacks above.
// `light` = white shapes for colored/gradient backgrounds.
export default function Doodles({ light = false }) {
  const fill = (brand, o) => (light ? `rgba(255,255,255,${o})` : brand);

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View
        style={[
          styles.shape,
          styles.ringBig,
          { borderColor: fill("rgba(138,0,230,0.08)", 0.09) },
        ]}
      />
      <View
        style={[
          styles.shape,
          styles.circleGold,
          { backgroundColor: fill("rgba(255,217,61,0.20)", 0.08) },
        ]}
      />
      <View
        style={[
          styles.shape,
          styles.squarePink,
          { backgroundColor: fill("rgba(199,15,82,0.10)", 0.07) },
        ]}
      />
      <View
        style={[
          styles.shape,
          styles.dotGreen,
          { backgroundColor: fill("rgba(17,150,0,0.14)", 0.10) },
        ]}
      />
      <View
        style={[
          styles.shape,
          styles.ringSmall,
          { borderColor: fill("rgba(123,77,255,0.12)", 0.10) },
        ]}
      />
      <View
        style={[
          styles.shape,
          styles.squarePurple,
          { backgroundColor: fill("rgba(138,0,230,0.09)", 0.06) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  shape: {
    position: "absolute",
  },
  ringBig: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 18,
    top: -45,
    right: -45,
  },
  circleGold: {
    width: 90,
    height: 90,
    borderRadius: 45,
    top: 150,
    left: -35,
  },
  squarePink: {
    width: 44,
    height: 44,
    borderRadius: 12,
    right: 28,
    top: 320,
    transform: [{ rotate: "24deg" }],
  },
  dotGreen: {
    width: 26,
    height: 26,
    borderRadius: 13,
    left: 42,
    bottom: 230,
  },
  ringSmall: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 11,
    right: -20,
    bottom: 100,
  },
  squarePurple: {
    width: 32,
    height: 32,
    borderRadius: 9,
    left: -10,
    top: 470,
    transform: [{ rotate: "-18deg" }],
  },
});
