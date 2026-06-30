import { useViewport } from "../components/RotatedScreen";

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

export function useResponsiveScale() {
  const { width, height } = useViewport();
  const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
  return Math.max(0.45, Math.min(scale, 1.5));
}

export function useResponsiveLayout() {
  const { width, height, rotation } = useViewport();
  const scale = useResponsiveScale();
  const inset = Math.max(12, Math.min(width, height) * 0.03);

  return {
    scale,
    width,
    height,
    rotation,
    inset,
    contentWidth: width - inset * 2,
  };
}
