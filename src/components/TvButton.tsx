import { useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { tvFocusRing } from "./tv-focus-styles";
import { useWebFocusTarget } from "../hooks/useWebTvRemote";

type TvButtonProps = {
  label: string;
  onPress: () => void;
  scale?: number;
  danger?: boolean;
  webFocused?: boolean;
  hasTVPreferredFocus?: boolean;
  style?: ViewStyle;
};

export function TvButton({
  label,
  onPress,
  scale = 1,
  danger = false,
  webFocused = false,
  hasTVPreferredFocus = false,
  style,
}: TvButtonProps) {
  const [nativeFocused, setNativeFocused] = useState(false);
  const ref = useRef<View>(null);
  const focused = Platform.OS === "web" ? webFocused : nativeFocused;

  useWebFocusTarget(ref, webFocused);

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      focusable
      hasTVPreferredFocus={hasTVPreferredFocus}
      onPress={onPress}
      onFocus={() => setNativeFocused(true)}
      onBlur={() => setNativeFocused(false)}
      {...(Platform.OS === "web" ? { tabIndex: webFocused ? 0 : -1 } : {})}
      style={[
        danger ? styles.danger : styles.button,
        {
          paddingVertical: 14 * scale,
          paddingHorizontal: 18 * scale,
          borderRadius: 9 * scale,
        },
        focused && tvFocusRing,
        style,
      ]}
    >
      <Text
        style={[
          danger ? styles.dangerText : styles.buttonText,
          { fontSize: 16 * scale },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#b8f36b",
    borderWidth: 1,
    borderColor: "transparent",
  },
  buttonText: { color: "#122006", fontWeight: "900" },
  danger: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#ff968f",
  },
  dangerText: { color: "#ff968f", fontWeight: "700" },
});
