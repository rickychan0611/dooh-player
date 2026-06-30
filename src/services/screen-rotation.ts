import AsyncStorage from "@react-native-async-storage/async-storage";

const ROTATION_KEY = "dooh:screen-rotation";

export type ScreenRotation = 0 | 90 | 180 | 270;

const ROTATIONS: ScreenRotation[] = [0, 90, 180, 270];

export function normalizeRotation(value: number): ScreenRotation {
  const normalized = ((value % 360) + 360) % 360;
  if (normalized === 90 || normalized === 180 || normalized === 270) {
    return normalized;
  }
  return 0;
}

export function rotateClockwise(current: ScreenRotation): ScreenRotation {
  return normalizeRotation(current + 90);
}

export function rotateCounterClockwise(current: ScreenRotation): ScreenRotation {
  return normalizeRotation(current - 90);
}

export async function loadScreenRotation(): Promise<ScreenRotation> {
  const raw = await AsyncStorage.getItem(ROTATION_KEY);
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return ROTATIONS.includes(parsed as ScreenRotation)
    ? (parsed as ScreenRotation)
    : 0;
}

export async function saveScreenRotation(rotation: ScreenRotation) {
  await AsyncStorage.setItem(ROTATION_KEY, String(rotation));
}
