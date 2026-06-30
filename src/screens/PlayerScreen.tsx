import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AdPlayer } from "../components/AdPlayer";
import { BulletinBoard } from "../components/BulletinBoard";
import {
  blockDurationMs,
  initialBlock,
  nextBlock,
  type RotationBlock,
} from "../services/rotation";
import type { CachedManifest } from "../types";

export function PlayerScreen({
  manifest,
  onItemChange,
}: {
  manifest: CachedManifest;
  onItemChange: (id: string | null) => void;
}) {
  const [block, setBlock] = useState<RotationBlock>(() => initialBlock(manifest));
  const stableItemChange = useCallback(onItemChange, [onItemChange]);

  useEffect(() => {
    setBlock(initialBlock(manifest));
  }, [manifest.contentVersion, manifest.mode]);

  useEffect(() => {
    if (manifest.mode !== "mixed_rotation") return;
    const timer = setTimeout(
      () => setBlock((current) => nextBlock(manifest, current)),
      blockDurationMs(manifest, block),
    );
    return () => clearTimeout(timer);
  }, [block, manifest]);

  if (manifest.serviceStatus === "suspended") {
    return (
      <View style={styles.suspended}>
        <Text style={styles.suspendedTitle}>Screen service paused</Text>
        <Text style={styles.suspendedBody}>
          The account owner can reactivate this screen from the billing page.
        </Text>
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={styles.screen}>
      {block === "ads" ? (
        <AdPlayer ads={manifest.ads} onItemChange={stableItemChange} />
      ) : (
        <BulletinBoard manifest={manifest} onItemChange={stableItemChange} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000", overflow: "hidden" },
  suspended: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    backgroundColor: "#000",
  },
  suspendedTitle: {
    color: "#f4f7f3",
    fontSize: 44,
    fontWeight: "900",
    textAlign: "center",
  },
  suspendedBody: {
    color: "#9aaca6",
    fontSize: 20,
    lineHeight: 30,
    marginTop: 16,
    maxWidth: 700,
    textAlign: "center",
  },
});
