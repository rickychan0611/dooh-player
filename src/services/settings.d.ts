import type { PlayerSettings } from "../types";
import type { PendingPairingSession } from "../lib/shared";

export function getDeviceId(): Promise<string>;
export function loadSettings(): Promise<PlayerSettings | null>;
export function saveSettings(settings: PlayerSettings): Promise<void>;
export function clearSettings(): Promise<void>;
export function loadPendingPairing(): Promise<PendingPairingSession | null>;
export function savePendingPairing(
  pairing: PendingPairingSession,
): Promise<void>;
export function clearPendingPairing(): Promise<void>;
