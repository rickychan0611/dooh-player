import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PlayerManifest } from "@dooh/shared";
import type { CachedManifest } from "../types";

const MANIFEST_KEY = "dooh:web-manifest";

export async function loadCachedManifest(): Promise<CachedManifest | null> {
  const raw = await AsyncStorage.getItem(MANIFEST_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function stageAndPromote(
  manifest: PlayerManifest,
): Promise<CachedManifest> {
  const cached: CachedManifest = {
    ...manifest,
    ads: manifest.ads.map((ad) => ({
      ...ad,
      localUri: ad.mediaUrl,
    })),
  };
  await AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(cached));
  return cached;
}
