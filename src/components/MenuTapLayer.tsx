import { useState } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import { tvFocusRing } from "./tv-focus-styles";

export function MenuTapLayer({ onPress }: { onPress: () => void }) {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityLabel="Open player menu"
      accessibilityRole="button"
      collapsable={false}
      focusable
      hasTVPreferredFocus
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.layer, focused && styles.focused]}
    />
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    elevation: Platform.OS === "android" ? 1000 : undefined,
    backgroundColor: Platform.OS === "android" ? "rgba(0,0,0,0.01)" : "transparent",
    borderWidth: 0,
    borderColor: "transparent",
  },
  focused: {
    ...tvFocusRing,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
});
