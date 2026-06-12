import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { getApiBaseUrl } from "../config";
import type { PlayerSettings } from "../types";
import {
  pendingPairingSessionSchema,
  type PendingPairingSession,
} from "@dooh/shared";

const SETTINGS_KEY = "dooh:settings";
const TOKEN_KEY = "dooh:web-device-token";
const DEVICE_ID_KEY = "dooh:device-id";
const PAIRING_KEY = "dooh:pending-pairing";

export async function getDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = `web-device-${Crypto.randomUUID()}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export async function loadSettings(): Promise<PlayerSettings | null> {
  const [raw, deviceToken] = await Promise.all([
    AsyncStorage.getItem(SETTINGS_KEY),
    AsyncStorage.getItem(TOKEN_KEY),
  ]);
  if (!raw || !deviceToken) return null;
  return {
    ...JSON.parse(raw),
    apiBaseUrl: getApiBaseUrl(),
    deviceToken,
  };
}

export async function saveSettings(settings: PlayerSettings) {
  const { deviceToken, apiBaseUrl: _apiBaseUrl, ...persistedSettings } = settings;
  await AsyncStorage.multiSet([
    [SETTINGS_KEY, JSON.stringify(persistedSettings)],
    [TOKEN_KEY, deviceToken],
  ]);
}

export async function clearSettings() {
  await AsyncStorage.multiRemove([
    SETTINGS_KEY,
    TOKEN_KEY,
    PAIRING_KEY,
    "dooh:active-version",
    "dooh:web-manifest",
  ]);
}

export async function loadPendingPairing(): Promise<PendingPairingSession | null> {
  const raw = await AsyncStorage.getItem(PAIRING_KEY);
  if (!raw) return null;
  const parsed = pendingPairingSessionSchema.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : null;
}

export async function savePendingPairing(pairing: PendingPairingSession) {
  await AsyncStorage.setItem(PAIRING_KEY, JSON.stringify(pairing));
}

export async function clearPendingPairing() {
  await AsyncStorage.removeItem(PAIRING_KEY);
}
