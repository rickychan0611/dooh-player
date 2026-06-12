import { useWindowDimensions } from "react-native";

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

export function useResponsiveScale() {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);

  return Math.max(0.45, Math.min(scale, 1.5));
}
