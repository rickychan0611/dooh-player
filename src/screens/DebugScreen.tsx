import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import type { CachedManifest, PlayerSettings } from "../types";

export function DebugScreen({
  settings, manifest, online, lastSyncAt, lastError, freeStorageMb, onSync, onReset, onClose,
}: {
  settings: PlayerSettings; manifest: CachedManifest | null; online: boolean; lastSyncAt: string | null; lastError: string | null;
  freeStorageMb: number;
  onSync: () => void; onReset: () => void; onClose: () => void;
}) {
  const scale = useResponsiveScale();
  const rows = [
    ["Screen ID", settings.screenCode], ["Device ID", settings.deviceId], ["Mode", manifest?.mode ?? "No cache"],
    ["Content version", String(manifest?.contentVersion ?? 0)], ["Internet", online ? "Online" : "Offline"],
    ["Last sync", lastSyncAt ?? "Never"], ["Cached files", String(manifest?.ads.length ?? 0)],
    ["Free storage", freeStorageMb > 0 ? `${freeStorageMb} MB` : "Unavailable"], ["Last error", lastError ?? "None"],
  ];
  return (
    <View style={[styles.screen, { padding: 30 * scale }]}><View style={[styles.panel, { width: 760 * scale, padding: 30 * scale, borderRadius: 18 * scale }]}><Text style={[styles.title, { fontSize: 34 * scale, marginBottom: 18 * scale }]}>Player diagnostics</Text>
      {rows.map(([label, value]) => <View style={[styles.row, { paddingVertical: 11 * scale, gap: 20 * scale }]} key={label}><Text style={[styles.label, { fontSize: 17 * scale }]}>{label}</Text><Text style={[styles.value, { fontSize: 17 * scale }]}>{value}</Text></View>)}
      <View style={[styles.actions, { gap: 12 * scale, marginTop: 24 * scale }]}>
        <RemoteButton label="Manual sync" scale={scale} onPress={onSync} />
        <RemoteButton label="Close" scale={scale} onPress={onClose} />
        <RemoteButton label="Reset setup" scale={scale} danger onPress={onReset} />
      </View>
    </View></View>
  );
}

function RemoteButton({
  label,
  scale,
  danger = false,
  onPress,
}: {
  label: string;
  scale: number;
  danger?: boolean;
  onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      focusable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        danger ? styles.danger : styles.button,
        {
          padding: 14 * scale,
          borderRadius: 9 * scale,
        },
        focused && styles.buttonFocused,
      ]}
    >
      <Text style={danger ? styles.dangerText : styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#07100e", alignItems: "center", justifyContent: "center" },
  panel: { maxWidth: "95%", backgroundColor: "#13211d" },
  title: { color: "#f4f7f3", fontWeight: "900" },
  row: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#2b3c37" },
  label: { color: "#91a49e" }, value: { color: "#fff", flexShrink: 1, textAlign: "right" },
  actions: { flexDirection: "row" },
  button: { backgroundColor: "#b8f36b" },
  buttonFocused: {
    borderWidth: 3,
    borderColor: "#ffffff",
    transform: [{ scale: 1.08 }],
  },
  buttonText: { color: "#122006", fontWeight: "900" },
  danger: { marginLeft: "auto", borderColor: "#ff968f", borderWidth: 1 },
  dangerText: { color: "#ff968f" },
});
