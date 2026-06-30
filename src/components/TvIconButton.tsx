import { useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { RotateIcon } from "./RotateIcon";
import { tvFocusRing } from "./tv-focus-styles";
import { useWebFocusTarget } from "../hooks/useWebTvRemote";

type TvIconButtonProps = {
  accessibilityLabel: string;
  direction: "cw" | "ccw";
  size: number;
  onPress: () => void;
  webFocused?: boolean;
  hasTVPreferredFocus?: boolean;
  style?: ViewStyle;
};

export function TvIconButton({
  accessibilityLabel,
  direction,
  size,
  onPress,
  webFocused = false,
  hasTVPreferredFocus = false,
  style,
}: TvIconButtonProps) {
  const [nativeFocused, setNativeFocused] = useState(false);
  const ref = useRef<View>(null);
  const focused = Platform.OS === "web" ? webFocused : nativeFocused;
  const iconSize = size * 0.68;

  useWebFocusTarget(ref, webFocused);

  return (
    <Pressable
      ref={ref}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      focusable
      hasTVPreferredFocus={hasTVPreferredFocus}
      onPress={onPress}
      onFocus={() => setNativeFocused(true)}
      onBlur={() => setNativeFocused(false)}
      {...(Platform.OS === "web" ? { tabIndex: webFocused ? 0 : -1 } : {})}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        focused && styles.buttonFocused,
        focused && tvFocusRing,
        style,
      ]}
    >
      <RotateIcon
        direction={direction}
        size={iconSize}
        color={focused ? "#122006" : "#f4f7f3"}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "#444",
  },
  buttonFocused: {
    backgroundColor: "#b8f36b",
  },
});
