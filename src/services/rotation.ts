import type { CachedManifest } from "../types";

export type RotationBlock = "ads" | "bulletin";

export function initialBlock(manifest: CachedManifest): RotationBlock {
  if (manifest.mode === "bulletin_only") return "bulletin";
  return "ads";
}

export function nextBlock(
  manifest: CachedManifest,
  current: RotationBlock,
): RotationBlock {
  if (manifest.mode === "ad_only") return "ads";
  if (manifest.mode === "bulletin_only") return "bulletin";
  if (!manifest.ads.length) return "bulletin";
  if (!manifest.bulletin.messages.length) return "ads";
  return current === "ads" ? "bulletin" : "ads";
}

export function blockDurationMs(manifest: CachedManifest, block: RotationBlock) {
  return (
    (block === "ads"
      ? manifest.settings.adBlockSeconds
      : manifest.settings.bulletinBlockSeconds) * 1000
  );
}

export const SLOT_COUNT = 14;
export const ROTATION_STEP = 15;

export function nextPostIndex(
  currentIndex: number,
  totalPosts: number,
  step: number = ROTATION_STEP,
): number {
  if (totalPosts <= 0) return 0;
  return (currentIndex + step) % totalPosts;
}

export function initialSlotIndices(_totalPosts: number): number[] {
  return Array.from({ length: SLOT_COUNT }, (_, slot) => slot);
}

export function clampSlotIndices(
  indices: number[],
  totalPosts: number,
): number[] {
  if (totalPosts <= 0) return indices.map(() => 0);
  return indices.map((index) => ((index % totalPosts) + totalPosts) % totalPosts);
}
