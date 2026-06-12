import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { getApiBaseUrl } from "../config";
import type { PlayerSettings } from "../types";
import {
  pendingPairingSessionSchema,
  type PendingPairingSession,
} from "@dooh/shared";

const SETTINGS_KEY = "dooh:settings";
const TOKEN_KEY = "dooh.device-token";
const PAIRING_KEY = "dooh:pending-pairing";
const PAIRING_TOKEN_KEY = "dooh.pairing-poll-token";

export async function getDeviceId() {
  const existing = await AsyncStorage.getItem("dooh:device-id");
  if (existing) return existing;
  const created = `device-${Crypto.randomUUID()}`;
  await AsyncStorage.setItem("dooh:device-id", created);
  return created;
}

export async function loadSettings(): Promise<PlayerSettings | null> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  const deviceToken = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!raw || !deviceToken) return null;
  return { ...JSON.parse(raw), apiBaseUrl: getApiBaseUrl(), deviceToken };
}

export async function saveSettings(settings: PlayerSettings) {
  const { deviceToken, ...publicSettings } = settings;
  const { apiBaseUrl: _apiBaseUrl, ...persistedSettings } = publicSettings;
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(persistedSettings));
  await SecureStore.setItemAsync(TOKEN_KEY, deviceToken);
}

export async function clearSettings() {
  await AsyncStorage.multiRemove([
    SETTINGS_KEY,
    PAIRING_KEY,
    "dooh:active-version",
  ]);
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(PAIRING_TOKEN_KEY),
  ]);
}

export async function loadPendingPairing(): Promise<PendingPairingSession | null> {
  const [raw, pollToken] = await Promise.all([
    AsyncStorage.getItem(PAIRING_KEY),
    SecureStore.getItemAsync(PAIRING_TOKEN_KEY),
  ]);
  if (!raw || !pollToken) return null;
  const parsed = pendingPairingSessionSchema.safeParse({
    ...JSON.parse(raw),
    pollToken,
  });
  return parsed.success ? parsed.data : null;
}

export async function savePendingPairing(pairing: PendingPairingSession) {
  const { pollToken, ...metadata } = pairing;
  await Promise.all([
    AsyncStorage.setItem(PAIRING_KEY, JSON.stringify(metadata)),
    SecureStore.setItemAsync(PAIRING_TOKEN_KEY, pollToken),
  ]);
}

export async function clearPendingPairing() {
  await Promise.all([
    AsyncStorage.removeItem(PAIRING_KEY),
    SecureStore.deleteItemAsync(PAIRING_TOKEN_KEY),
  ]);
}
