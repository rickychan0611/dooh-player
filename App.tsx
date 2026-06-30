import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BackHandler, Platform, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { activateKeepAwakeAsync } from "expo-keep-awake";
import { NavigationBar as SystemNavigationBar } from "expo-navigation-bar";
import * as Network from "expo-network";
import { StatusBar } from "expo-status-bar";
import { fetchManifest, sendHeartbeat } from "./src/services/api";
import { loadCachedManifest, stageAndPromote } from "./src/services/cache";
import { flushErrors, errorMessage, isPlayerAuthError, queueError, userFacingConnectionError } from "./src/services/errors";
import { clearSettings, loadSettings } from "./src/services/settings";
import {
  loadScreenRotation,
  rotateClockwise,
  rotateCounterClockwise,
  saveScreenRotation,
  type ScreenRotation,
} from "./src/services/screen-rotation";
import { getFreeStorageMb } from "./src/services/storage";
import { DebugScreen } from "./src/screens/DebugScreen";
import { RotatedScreen } from "./src/components/RotatedScreen";
import { MenuTapLayer } from "./src/components/MenuTapLayer";
import { TvButton } from "./src/components/TvButton";
import { useResponsiveLayout } from "./src/hooks/useResponsiveScale";
import { useWebTvRemote } from "./src/hooks/useWebTvRemote";
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

function ResetPairingButton({
  scale,
  onPress,
}: {
  scale: number;
  onPress: () => void;
}) {
  const [focusIndex, setFocusIndex] = useState(0);

  useWebTvRemote({
    itemCount: 1,
    focusIndex,
    setFocusIndex,
    onSelect: () => onPress(),
  });

  return (
    <TvButton
      label="Reset pairing"
      scale={scale}
      hasTVPreferredFocus
      webFocused
      onPress={onPress}
      style={{ marginTop: 24 * scale }}
    />
  );
}

function LoadingView({
  children,
}: {
  children: (layout: ReturnType<typeof useResponsiveLayout>) => ReactNode;
}) {
  const layout = useResponsiveLayout();
  return (
    <View style={[styles.loading, { padding: layout.inset }]}>
      {children(layout)}
    </View>
  );
}

export default function App() {
  const [settings, setSettings] = useState<PlayerSettings | null>(null);
  const [manifest, setManifest] = useState<CachedManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);
  const [debug, setDebug] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [freeStorageMb, setFreeStorageMb] = useState(0);
  const [screenRotation, setScreenRotation] = useState<ScreenRotation>(0);

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
    Promise.all([loadSettings(), loadCachedManifest(), loadScreenRotation()]).then(
      ([saved, cached, rotation]) => {
      setSettings(saved);
      setManifest(cached);
      setScreenRotation(rotation);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter" && settings && manifest && !debug) {
          event.preventDefault();
          event.stopImmediatePropagation();
          setDebug(true);
          return;
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

  async function updateRotation(next: ScreenRotation) {
    setScreenRotation(next);
    await saveScreenRotation(next);
  }

  const showMenuTap = Boolean(settings && manifest && !debug && !loading);

  function renderContent() {
    if (loading) {
      return (
        <LoadingView>
          {(layout) => (
            <Text style={[styles.loadingText, { fontSize: 28 * layout.scale }]}>
              Starting player...
            </Text>
          )}
        </LoadingView>
      );
    }
    if (!settings) {
      return (
        <SetupScreen
          onComplete={setSettings}
          onRotateClockwise={() => void updateRotation(rotateClockwise(screenRotation))}
          onRotateCounterClockwise={() =>
            void updateRotation(rotateCounterClockwise(screenRotation))
          }
        />
      );
    }
    if (debug) {
      return (
        <DebugScreen
          settings={settings}
          manifest={manifest}
          online={online}
          lastSyncAt={lastSyncAt}
          lastError={lastError}
          freeStorageMb={freeStorageMb}
          rotation={screenRotation}
          onSync={sync}
          onReset={reset}
          onClose={() => setDebug(false)}
          onRotateClockwise={() => void updateRotation(rotateClockwise(screenRotation))}
          onRotateCounterClockwise={() =>
            void updateRotation(rotateCounterClockwise(screenRotation))
          }
        />
      );
    }
    if (!manifest) {
      return (
        <LoadingView>
          {(layout) => (
            <>
              <Text
                style={[
                  styles.loadingText,
                  { fontSize: 28 * layout.scale, maxWidth: layout.contentWidth },
                ]}
              >
                {Platform.OS === "web"
                  ? "Downloading screen content..."
                  : "Waiting for the first complete content download..."}
              </Text>
              {lastError ? (
                <Text
                  style={[
                    styles.error,
                    {
                      fontSize: 17 * layout.scale,
                      marginTop: 15 * layout.scale,
                      maxWidth: layout.contentWidth,
                    },
                  ]}
                >
                  {lastError}
                </Text>
              ) : null}
              <ResetPairingButton scale={layout.scale} onPress={reset} />
            </>
          )}
        </LoadingView>
      );
    }
    return (
      <PlayerScreen manifest={manifest} onItemChange={setCurrentItemId} />
    );
  }

  return (
    <View style={styles.shell}>
      <RotatedScreen rotation={screenRotation}>{renderContent()}</RotatedScreen>
      {showMenuTap ? <MenuTapLayer onPress={() => setDebug(true)} /> : null}
      <StatusBar hidden />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#000",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  loadingText: { color: "#f4f7f3", textAlign: "center" },
  error: { color: "#ff968f", textAlign: "center", maxWidth: 560 },
});
