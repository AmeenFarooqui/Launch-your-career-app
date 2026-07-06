import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

// Entrance: fade in while springing up from below. Stagger siblings by
// passing increasing delays. Preserves any transform already in `style`
// (e.g. a rotate tilt) instead of clobbering it.
export function FadeInUp({ delay = 0, style, children }) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(v, {
      toValue: 1,
      delay,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [v, delay]);

  const baseTransform = (StyleSheet.flatten(style) || {}).transform || [];

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [
            ...baseTransform,
            {
              translateY: v.interpolate({
                inputRange: [0, 1],
                outputRange: [28, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Ambient: gentle endless up-and-down drift.
export function Float({ range = 7, duration = 1900, style, children }) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            {
              translateY: v.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -range],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Ambient: soft endless heartbeat scale.
export function Pulse({ to = 1.15, duration = 900, style, children }) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            {
              scale: v.interpolate({
                inputRange: [0, 1],
                outputRange: [1, to],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
