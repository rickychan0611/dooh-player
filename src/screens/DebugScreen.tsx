import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { RotationControls } from "../components/RotationControls";
import { TvButton } from "../components/TvButton";
import { useResponsiveLayout } from "../hooks/useResponsiveScale";
import { useWebTvRemote, NO_TV_FOCUS } from "../hooks/useWebTvRemote";
import type { ScreenRotation } from "../services/screen-rotation";
import type { CachedManifest, PlayerSettings } from "../types";

const MENU_ACTION_COUNT = 5;

export function DebugScreen({
  settings,
  manifest,
  online,
  lastSyncAt,
  lastError,
  freeStorageMb,
  rotation,
  onSync,
  onReset,
  onClose,
  onRotateClockwise,
  onRotateCounterClockwise,
}: {
  settings: PlayerSettings;
  manifest: CachedManifest | null;
  online: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  freeStorageMb: number;
  rotation: ScreenRotation;
  onSync: () => void;
  onReset: () => void;
  onClose: () => void;
  onRotateClockwise: () => void;
  onRotateCounterClockwise: () => void;
}) {
  const { scale, inset, contentWidth } = useResponsiveLayout();
  const panelPadding = 22 * scale;
  const [focusIndex, setFocusIndex] = useState(NO_TV_FOCUS);

  const runFocusedAction = useCallback(
    (index: number) => {
      const actions = [
        onRotateCounterClockwise,
        onRotateClockwise,
        onSync,
        onClose,
        onReset,
      ];
      actions[index]?.();
    },
    [onClose, onReset, onRotateClockwise, onRotateCounterClockwise, onSync],
  );

  useWebTvRemote({
    itemCount: MENU_ACTION_COUNT,
    focusIndex,
    setFocusIndex,
    onSelect: runFocusedAction,
  });

  const isFocused = (index: number) => focusIndex === index;

  const rows = [
    ["Screen ID", settings.screenCode],
    ["Device ID", settings.deviceId],
    ["Mode", manifest?.mode ?? "No cache"],
    ["Content version", String(manifest?.contentVersion ?? 0)],
    ["Internet", online ? "Online" : "Offline"],
    ["Last sync", lastSyncAt ?? "Never"],
    ["Cached files", String(manifest?.ads.length ?? 0)],
    ["Free storage", freeStorageMb > 0 ? `${freeStorageMb} MB` : "Unavailable"],
    ["Display rotation", `${rotation}°`],
    ["Last error", lastError ?? "None"],
  ];

  return (
    <View style={[styles.screen, { padding: inset }]}>
      <View
        style={[
          styles.panel,
          {
            width: contentWidth,
            maxWidth: contentWidth,
            padding: panelPadding,
            borderRadius: 18 * scale,
          },
        ]}
      >
        <View style={[styles.headerRow, { marginBottom: 18 * scale, gap: 12 * scale }]}>
          <Text
            style={[styles.title, { fontSize: 34 * scale, flexShrink: 1 }]}
            numberOfLines={1}
          >
            Player menu
          </Text>
          <RotationControls
            inline
            webFocusIndex={focusIndex}
            focusStartIndex={0}
            onRotateClockwise={onRotateClockwise}
            onRotateCounterClockwise={onRotateCounterClockwise}
          />
        </View>
        {rows.map(([label, value]) => (
          <View
            style={[styles.row, { paddingVertical: 11 * scale, gap: 12 * scale }]}
            key={label}
          >
            <Text style={[styles.label, { fontSize: 17 * scale, flex: 1 }]} numberOfLines={2}>
              {label}
            </Text>
            <Text style={[styles.value, { fontSize: 17 * scale, flex: 1.2 }]} numberOfLines={3}>
              {value}
            </Text>
          </View>
        ))}
        <View style={[styles.actions, { gap: 12 * scale, marginTop: 24 * scale }]}>
          <TvButton
            label="Manual sync"
            scale={scale}
            webFocused={isFocused(2)}
            onPress={onSync}
          />
          <TvButton label="Close" scale={scale} webFocused={isFocused(3)} onPress={onClose} />
          <TvButton
            label="Reset setup"
            scale={scale}
            danger
            webFocused={isFocused(4)}
            onPress={onReset}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  panel: {
    backgroundColor: "#111",
    alignSelf: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#333",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: "#fff", fontWeight: "900" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  label: { color: "#999" },
  value: { color: "#fff", textAlign: "right" },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
});
