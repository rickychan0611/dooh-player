import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
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
  onOpenDebug,
}: {
  manifest: CachedManifest;
  onItemChange: (id: string | null) => void;
  onOpenDebug: () => void;
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

  return (
    <Pressable
      accessibilityLabel="DOOH player"
      focusable
      hasTVPreferredFocus
      onPress={onOpenDebug}
      style={styles.screen}
    >
      {block === "ads" ? (
        <AdPlayer ads={manifest.ads} onItemChange={stableItemChange} />
      ) : (
        <BulletinBoard manifest={manifest} onItemChange={stableItemChange} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
});
