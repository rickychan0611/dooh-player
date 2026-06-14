import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import * as Network from "expo-network";
import { formatClaimCode, type PendingPairingSession } from "../lib/shared";
import { getApiBaseUrl } from "../config";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import {
  createPairingSession,
  fetchPairingSessionStatus,
} from "../services/api";
import { pairingSecondsRemaining } from "../services/pairing";
import {
  clearPendingPairing,
  getDeviceId,
  loadPendingPairing,
  savePendingPairing,
  saveSettings,
} from "../services/settings";
import type { PlayerSettings } from "../types";

export function SetupScreen({
  onComplete,
}: {
  onComplete: (settings: PlayerSettings) => void;
}) {
  const scale = useResponsiveScale();
  const [pairing, setPairing] = useState<PendingPairingSession | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [online, setOnline] = useState(true);
  const [status, setStatus] = useState("Preparing a pairing code...");
  const busy = useRef(false);
  const pairingRef = useRef<PendingPairingSession | null>(null);

  useEffect(() => {
    pairingRef.current = pairing;
    setSeconds(pairingSecondsRemaining(pairing?.expiresAt));
  }, [pairing]);

  async function networkAvailable() {
    const network = await Network.getNetworkStateAsync();
    return Boolean(
      network.isConnected && network.isInternetReachable !== false,
    );
  }

  async function requestPairing() {
    if (busy.current) return;
    busy.current = true;
    try {
      const connected = await networkAvailable();
      setOnline(connected);
      if (!connected) {
        setStatus("Offline. Reconnecting automatically...");
        return;
      }
      setStatus("Preparing a pairing code...");
      const apiBaseUrl = getApiBaseUrl();
      const deviceId = await getDeviceId();
      const created = await createPairingSession({
        apiBaseUrl,
        deviceId,
        appVersion: Constants.expoConfig?.version ?? "1.0.0",
      });
      await savePendingPairing(created);
      setPairing(created);
      setStatus("Enter this code in the admin dashboard.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Pairing failed.");
    } finally {
      busy.current = false;
    }
  }

  async function poll() {
    if (busy.current) return;
    const current = pairingRef.current;
    if (!current || pairingSecondsRemaining(current.expiresAt) === 0) {
      await clearPendingPairing();
      setPairing(null);
      await requestPairing();
      return;
    }
    busy.current = true;
    try {
      const connected = await networkAvailable();
      setOnline(connected);
      if (!connected) {
        setStatus("Offline. This code cannot be claimed until reconnected.");
        return;
      }
      const apiBaseUrl = getApiBaseUrl();
      const result = await fetchPairingSessionStatus(
        apiBaseUrl,
        current.pollToken,
      );
      if (result.status === "expired") {
        await clearPendingPairing();
        setPairing(null);
        return;
      }
      if (result.status === "claimed") {
        const deviceId = await getDeviceId();
        const settings = {
          apiBaseUrl,
          screenCode: result.screenCode,
          deviceId,
          deviceToken: result.deviceToken,
        };
        await saveSettings(settings);
        await clearPendingPairing();
        onComplete(settings);
        return;
      }
      setStatus("Waiting for an administrator to connect this player...");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Pairing failed.");
    } finally {
      busy.current = false;
    }
  }

  useEffect(() => {
    let active = true;
    loadPendingPairing().then((saved) => {
      if (!active) return;
      if (saved && pairingSecondsRemaining(saved.expiresAt) > 0) {
        setPairing(saved);
        setStatus("Waiting for an administrator to connect this player...");
      } else {
        clearPendingPairing().then(requestPairing);
      }
    });
    const pollTimer = setInterval(poll, 3_000);
    const countdownTimer = setInterval(
      () => setSeconds(pairingSecondsRemaining(pairingRef.current?.expiresAt)),
      1_000,
    );
    return () => {
      active = false;
      clearInterval(pollTimer);
      clearInterval(countdownTimer);
    };
  }, []);

  const minutes = Math.floor(seconds / 60);
  const secondPart = String(seconds % 60).padStart(2, "0");

  return (
    <View style={[styles.screen, { padding: 40 * scale }]}>
      <View
        style={[
          styles.card,
          {
            width: 720 * scale,
            padding: 44 * scale,
            borderRadius: 20 * scale,
            gap: 18 * scale,
            opacity: online ? 1 : 0.6,
          },
        ]}
      >
        <Text style={[styles.kicker, { fontSize: 14 * scale, letterSpacing: 3 * scale }]}>
          DOOH PLAYER
        </Text>
        <Text style={[styles.title, { fontSize: 40 * scale }]}>
          Connect this screen
        </Text>
        <Text style={[styles.instructions, { fontSize: 19 * scale, lineHeight: 27 * scale }]}>
          Open this screen in the admin dashboard and enter the code below.
        </Text>
        <Text
          style={[
            styles.code,
            {
              fontSize: 76 * scale,
              letterSpacing: 9 * scale,
              paddingVertical: 22 * scale,
            },
          ]}
        >
          {pairing ? formatClaimCode(pairing.claimCode) : "--- ---"}
        </Text>
        <Text style={[styles.expiry, { fontSize: 17 * scale }]}>
          {pairing ? `Code refreshes in ${minutes}:${secondPart}` : "Requesting code..."}
        </Text>
        <Text style={[online ? styles.status : styles.offline, { fontSize: 17 * scale }]}>
          {status}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#08110f",
    alignItems: "center",
    justifyContent: "center",
  },
  card: { maxWidth: "95%", backgroundColor: "#101c19", alignItems: "center" },
  kicker: { color: "#b8f36b", fontWeight: "800" },
  title: { color: "#f4f7f3", fontWeight: "900", textAlign: "center" },
  instructions: { color: "#aebdb8", textAlign: "center" },
  code: {
    color: "#b8f36b",
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  expiry: { color: "#cbd7d3", fontWeight: "700" },
  status: { color: "#cbd7d3", textAlign: "center" },
  offline: { color: "#ffb3ad", textAlign: "center", fontWeight: "700" },
});
