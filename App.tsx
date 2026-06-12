import { useCallback, useEffect, useState } from "react";
import { BackHandler, Platform, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { activateKeepAwakeAsync } from "expo-keep-awake";
import { NavigationBar as SystemNavigationBar } from "expo-navigation-bar";
import * as Network from "expo-network";
import { StatusBar } from "expo-status-bar";
import { fetchManifest, sendHeartbeat } from "./src/services/api";
import { loadCachedManifest, stageAndPromote } from "./src/services/cache";
import { flushErrors, queueError } from "./src/services/errors";
import { clearSettings, loadSettings } from "./src/services/settings";
import { getFreeStorageMb } from "./src/services/storage";
import { DebugScreen } from "./src/screens/DebugScreen";
import { useResponsiveScale } from "./src/hooks/useResponsiveScale";
import { PlayerScreen } from "./src/screens/PlayerScreen";
import { SetupScreen } from "./src/screens/SetupScreen";
import type { CachedManifest, PlayerSettings } from "./src/types";

export default function App() {
  const scale = useResponsiveScale();
  const [settings, setSettings] = useState<PlayerSettings | null>(null);
  const [manifest, setManifest] = useState<CachedManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [debug, setDebug] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [freeStorageMb, setFreeStorageMb] = useState(0);

  useEffect(() => {
    activateKeepAwakeAsync("dooh-player");
    if (Platform.OS === "android") {
      SystemNavigationBar.setHidden(true);
    }
    Promise.all([loadSettings(), loadCachedManifest()]).then(([saved, cached]) => {
      setSettings(saved);
      setManifest(cached);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter" && settings && manifest && !debug) {
          event.preventDefault();
          setDebug(true);
        }
        if ((event.key === "Escape" || event.key === "Backspace") && debug) {
          event.preventDefault();
          setDebug(false);
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!debug) return false;
        setDebug(false);
        return true;
      },
    );
    return () => subscription.remove();
  }, [debug, manifest, settings]);

  const sync = useCallback(async () => {
    if (!settings) return;
    try {
      const network = await Network.getNetworkStateAsync();
      const connected = Boolean(network.isConnected && network.isInternetReachable !== false);
      setOnline(connected);
      if (!connected) return;
      const remote = await fetchManifest(settings);
      const promoted = await stageAndPromote(remote);
      setManifest(promoted);
      const now = new Date().toISOString();
      setLastSyncAt(now);
      setLastError(null);
      await flushErrors(settings);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Synchronization failed.";
      setLastError(message);
      await queueError({ errorType: "sync_error", errorMessage: message });
    }
  }, [settings]);

  useEffect(() => {
    if (!settings) return;
    sync();
    const timer = setInterval(sync, 60_000);
    return () => clearInterval(timer);
  }, [settings, sync]);

  useEffect(() => {
    if (!settings || !manifest) return;
    async function heartbeat() {
      try {
        const network = await Network.getNetworkStateAsync();
        const connected = Boolean(network.isConnected && network.isInternetReachable !== false);
        setOnline(connected);
        if (!connected) return;
        const availableStorageMb = await getFreeStorageMb();
        setFreeStorageMb(availableStorageMb);
        await sendHeartbeat(settings!, {
          deviceId: settings!.deviceId,
          appVersion: Constants.expoConfig?.version ?? "1.0.0",
          mode: manifest!.mode,
          layout: manifest!.layout,
          contentVersion: manifest!.contentVersion,
          currentItemId,
          freeStorageMb: availableStorageMb,
          lastSyncAt,
          error: lastError,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Heartbeat failed.";
        setLastError(message);
        await queueError({ errorType: "heartbeat_error", errorMessage: message });
      }
    }
    heartbeat();
    const timer = setInterval(heartbeat, 120_000);
    return () => clearInterval(timer);
  }, [currentItemId, lastError, lastSyncAt, manifest, settings]);

  async function reset() {
    await clearSettings();
    setSettings(null);
    setManifest(null);
    setDebug(false);
  }

  if (loading) {
    return <View style={[styles.loading, { padding: 30 * scale }]}><Text style={[styles.loadingText, { fontSize: 28 * scale }]}>Starting player...</Text><StatusBar hidden /></View>;
  }
  if (!settings) {
    return <><SetupScreen onComplete={setSettings} /><StatusBar hidden /></>;
  }
  if (debug) {
    return <><DebugScreen settings={settings} manifest={manifest} online={online} lastSyncAt={lastSyncAt} lastError={lastError} freeStorageMb={freeStorageMb} onSync={sync} onReset={reset} onClose={() => setDebug(false)} /><StatusBar hidden /></>;
  }
  if (!manifest) {
    return <View style={[styles.loading, { padding: 30 * scale }]}><Text style={[styles.loadingText, { fontSize: 28 * scale }]}>Waiting for the first complete content download...</Text><Text style={[styles.error, { fontSize: 17 * scale, marginTop: 15 * scale }]}>{lastError}</Text><StatusBar hidden /></View>;
  }
  return <><PlayerScreen manifest={manifest} onItemChange={setCurrentItemId} onOpenDebug={() => setDebug(true)} /><StatusBar hidden /></>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#08110f" },
  loadingText: { color: "#f4f7f3", textAlign: "center" },
  error: { color: "#ff968f", textAlign: "center" },
});
