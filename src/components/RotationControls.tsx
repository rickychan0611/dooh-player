import { useResponsiveLayout } from "../hooks/useResponsiveScale";
import { isWebFocusActive } from "../hooks/useWebTvRemote";
import { TvIconButton } from "./TvIconButton";
import { StyleSheet, View } from "react-native";

export function RotationControls({
  onRotateClockwise,
  onRotateCounterClockwise,
  inline = false,
  webFocusIndex,
  focusStartIndex = 0,
}: {
  onRotateClockwise: () => void;
  onRotateCounterClockwise: () => void;
  inline?: boolean;
  webFocusIndex?: number;
  focusStartIndex?: number;
}) {
  const { scale } = useResponsiveLayout();
  const size = 44 * scale;

  return (
    <View
      style={[
        styles.row,
        { gap: 10 * scale },
        inline ? styles.inline : [styles.floating, { top: 16 * scale, right: 16 * scale }],
      ]}
    >
      <TvIconButton
        accessibilityLabel="Rotate counter-clockwise"
        direction="ccw"
        size={size}
        webFocused={isWebFocusActive(webFocusIndex, focusStartIndex)}
        onPress={onRotateCounterClockwise}
      />
      <TvIconButton
        accessibilityLabel="Rotate clockwise"
        direction="cw"
        size={size}
        webFocused={isWebFocusActive(webFocusIndex, focusStartIndex + 1)}
        onPress={onRotateClockwise}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  floating: {
    position: "absolute",
    zIndex: 10,
  },
  inline: {
    flexShrink: 0,
  },
});
