import React, { useRef } from "react";
import { Animated, Pressable } from "react-native";

// Shared press feedback: soft clay squash (scale down ~4%) on press-in.
// Use in place of TouchableOpacity everywhere something is tappable.
export default function PressableScale({ children, style, onPress, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.96,
      speed: 40,
      bounciness: 0,
      useNativeDriver: true,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      speed: 30,
      bounciness: 8,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessibilityRole="button"
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
