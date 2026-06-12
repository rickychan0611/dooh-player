import { describe, expect, it } from "vitest";
import { nextBlock } from "../src/services/rotation";
import type { CachedManifest } from "../src/types";

const manifest = {
  mode: "mixed_rotation",
  ads: [{ id: "ad" }],
  bulletin: { messages: [{ id: "message" }] },
} as unknown as CachedManifest;

describe("mixed rotation", () => {
  it("alternates between populated blocks", () => {
    expect(nextBlock(manifest, "ads")).toBe("bulletin");
    expect(nextBlock(manifest, "bulletin")).toBe("ads");
  });

  it("does not switch to an empty block", () => {
    expect(nextBlock({ ...manifest, ads: [] }, "bulletin")).toBe("bulletin");
  });
});
