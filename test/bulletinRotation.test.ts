import { describe, expect, it } from "vitest";
import {
  ROTATION_STEP,
  SLOT_COUNT,
  clampSlotIndices,
  initialSlotIndices,
  nextPostIndex,
} from "../src/services/rotation";

describe("bulletin slot rotation", () => {
  it("advances by the deterministic +15 step", () => {
    expect(nextPostIndex(0, 100)).toBe(15);
    expect(nextPostIndex(15, 100)).toBe(30);
    expect(ROTATION_STEP).toBe(15);
  });

  it("wraps around using (currentIndex + 15) % totalPosts", () => {
    expect(nextPostIndex(20, 30)).toBe((20 + 15) % 30);
    expect(nextPostIndex(20, 30)).toBe(5);
  });

  it("returns 0 when there are no posts", () => {
    expect(nextPostIndex(7, 0)).toBe(0);
    expect(nextPostIndex(7, -3)).toBe(0);
  });

  it("seeds the first 14 slots with sequential post indices", () => {
    expect(initialSlotIndices(50)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
    ]);
    expect(initialSlotIndices(50)).toHaveLength(SLOT_COUNT);
  });

  it("clamps indices into range after the post count changes", () => {
    expect(clampSlotIndices([0, 15, 30, 45], 20)).toEqual([0, 15, 10, 5]);
  });

  it("collapses every slot to 0 when all posts are removed", () => {
    expect(clampSlotIndices([3, 9, 27], 0)).toEqual([0, 0, 0]);
  });
});
