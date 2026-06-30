import { describe, expect, it } from "vitest";
import {
  normalizeRotation,
  rotateClockwise,
  rotateCounterClockwise,
} from "../src/services/screen-rotation";

describe("screen rotation", () => {
  it("steps clockwise in 90 degree increments", () => {
    expect(rotateClockwise(0)).toBe(90);
    expect(rotateClockwise(90)).toBe(180);
    expect(rotateClockwise(180)).toBe(270);
    expect(rotateClockwise(270)).toBe(0);
  });

  it("steps counter-clockwise in 90 degree increments", () => {
    expect(rotateCounterClockwise(0)).toBe(270);
    expect(rotateCounterClockwise(270)).toBe(180);
    expect(rotateCounterClockwise(180)).toBe(90);
    expect(rotateCounterClockwise(90)).toBe(0);
  });

  it("normalizes arbitrary values", () => {
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(45)).toBe(0);
  });
});
