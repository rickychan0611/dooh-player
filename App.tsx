import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { activateKeepAwakeAsync } from "expo-keep-awake";
import { NavigationBar as SystemNavigationBar } from "expo-navigation-bar";
import * as Network from "expo-network";
import { StatusBar } from "expo-status-bar";
import { fetchManifest, sendHeartbeat } from "./src/services/api";
import { loadCachedManifest, stageAndPromote } from "./src/services/cache";
import { flushErrors, errorMessage, isPlayerAuthError, queueError, userFacingConnectionError } from "./src/services/errors";
import { clearSettings, loadSettings } from "./src/services/settings";
import { getFreeStorageMb } from "./src/services/storage";
import { DebugScreen } from "./src/screens/DebugScreen";
import { useResponsiveScale } from "./src/hooks/useResponsiveScale";
import { PlayerScreen } from "./src/screens/PlayerScreen";
import { SetupScreen } from "./src/screens/SetupScreen";
import type { CachedManifest, PlayerSettings } from "./src/types";

async function readNetworkConnected() {
  const network = await Network.getNetworkStateAsync();
  return Boolean(network.isConnected && network.isInternetReachable !== false);
}

function readNetworkConnectedFromState(state: Network.NetworkState) {
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

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

  const settingsRef = useRef(settings);
  const manifestRef = useRef(manifest);
  const currentItemIdRef = useRef(currentItemId);
  const lastSyncAtRef = useRef(lastSyncAt);
  const lastErrorRef = useRef(lastError);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    manifestRef.current = manifest;
  }, [manifest]);
  useEffect(() => {
    currentItemIdRef.current = currentItemId;
  }, [currentItemId]);
  useEffect(() => {
    lastSyncAtRef.current = lastSyncAt;
  }, [lastSyncAt]);
  useEffect(() => {
    lastErrorRef.current = lastError;
  }, [lastError]);

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
    const currentSettings = settingsRef.current;
    if (!currentSettings) return;
    try {
      const connected = await readNetworkConnected();
      setOnline(connected);
      if (!connected) return;
      const remote = await fetchManifest(currentSettings);
      const promoted = await stageAndPromote(remote);
      setManifest(promoted);
      const now = new Date().toISOString();
      setLastSyncAt(now);
      setLastError(null);
      await flushErrors(currentSettings);
    } catch (error) {
      if (isPlayerAuthError(error)) {
        await clearSettings();
        setSettings(null);
        setManifest(null);
        setLastError(null);
        return;
      }
      setLastError(userFacingConnectionError(error));
      await queueError({ errorType: "sync_error", errorMessage: errorMessage(error) });
    }
  }, []);

  const heartbeat = useCallback(async () => {
    const currentSettings = settingsRef.current;
    const currentManifest = manifestRef.current;
    if (!currentSettings || !currentManifest || !lastSyncAtRef.current) return;

    try {
      const connected = await readNetworkConnected();
      setOnline(connected);
      if (!connected) return;

      const availableStorageMb = await getFreeStorageMb();
      setFreeStorageMb(availableStorageMb);
      await sendHeartbeat(currentSettings, {
        deviceId: currentSettings.deviceId,
        appVersion: Constants.expoConfig?.version ?? "1.0.0",
        mode: currentManifest.mode,
        layout: currentManifest.layout,
        contentVersion: currentManifest.contentVersion,
        currentItemId: currentItemIdRef.current,
        freeStorageMb: availableStorageMb,
        lastSyncAt: lastSyncAtRef.current,
        error: lastErrorRef.current,
      });
    } catch {
      // Retry on the next interval or when connectivity returns.
    }
  }, []);

  useEffect(() => {
    if (!settings) return;
    sync();
    const timer = setInterval(sync, 60_000);
    return () => clearInterval(timer);
  }, [settings, sync]);

  useEffect(() => {
    if (!settings || !manifest) return;
    heartbeat();
    const timer = setInterval(heartbeat, 120_000);
    return () => clearInterval(timer);
  }, [settings, manifest, heartbeat]);

  useEffect(() => {
    if (!settings) return;

    let wasConnected = false;

    async function catchUpAfterReconnect() {
      await sync();
      await heartbeat();
    }

    void readNetworkConnected().then((connected) => {
      wasConnected = connected;
      setOnline(connected);
    });

    const subscription = Network.addNetworkStateListener((state) => {
      const connected = readNetworkConnectedFromState(state);
      setOnline(connected);
      if (connected && !wasConnected) {
        void catchUpAfterReconnect();
      }
      wasConnected = connected;
    });

    return () => subscription.remove();
  }, [settings, sync, heartbeat]);

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
    return (
      <View style={[styles.loading, { padding: 30 * scale }]}>
        <Text style={[styles.loadingText, { fontSize: 28 * scale }]}>
          {Platform.OS === "web"
            ? "Downloading screen content..."
            : "Waiting for the first complete content download..."}
        </Text>
        {lastError ? (
          <Text style={[styles.error, { fontSize: 17 * scale, marginTop: 15 * scale }]}>
            {lastError}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={reset}
          style={[styles.resetButton, { marginTop: 24 * scale, padding: 14 * scale }]}
        >
          <Text style={[styles.resetButtonText, { fontSize: 16 * scale }]}>Reset pairing</Text>
        </Pressable>
        <StatusBar hidden />
      </View>
    );
  }
  return <><PlayerScreen manifest={manifest} onItemChange={setCurrentItemId} onOpenDebug={() => setDebug(true)} /><StatusBar hidden /></>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#08110f" },
  loadingText: { color: "#f4f7f3", textAlign: "center" },
  error: { color: "#ff968f", textAlign: "center", maxWidth: 560 },
  resetButton: {
    borderWidth: 1,
    borderColor: "#2b3c37",
    borderRadius: 10,
    backgroundColor: "#101c19",
  },
  resetButtonText: { color: "#b8f36b", fontWeight: "700" },
});
