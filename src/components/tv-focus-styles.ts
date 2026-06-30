import { Platform, StyleSheet } from "react-native";

export const TV_FOCUS_BORDER_WIDTH = 3;

export const tvFocusRing = {
  borderWidth: TV_FOCUS_BORDER_WIDTH,
  borderColor: "#ffffff",
  ...(Platform.OS === "web"
    ? ({
        outlineStyle: "solid",
        outlineWidth: TV_FOCUS_BORDER_WIDTH,
        outlineColor: "#ffffff",
      } as object)
    : {}),
};

export const tvFocusStyles = StyleSheet.create({
  ring: tvFocusRing,
});
