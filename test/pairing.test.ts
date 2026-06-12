import { describe, expect, it } from "vitest";
import { pairingSecondsRemaining } from "../src/services/pairing";

describe("player pairing expiry", () => {
  it("rounds a partial second up for the countdown", () => {
    expect(
      pairingSecondsRemaining("2026-06-11T12:00:01.001Z", Date.parse("2026-06-11T12:00:00.000Z")),
    ).toBe(2);
  });

  it("returns zero for expired and missing sessions", () => {
    const now = Date.parse("2026-06-11T12:00:00.000Z");
    expect(pairingSecondsRemaining("2026-06-11T11:59:59.000Z", now)).toBe(0);
    expect(pairingSecondsRemaining(undefined, now)).toBe(0);
  });
});
