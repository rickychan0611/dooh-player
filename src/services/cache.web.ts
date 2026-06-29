import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PlayerManifest } from "../lib/shared";
import type { CachedAd, CachedManifest } from "../types";

const MANIFEST_KEY = "dooh:web-manifest";
const CACHE_NAME = "dooh-player-media-v1";

function cacheRequest(ad: PlayerManifest["ads"][number]) {
  return new Request(
    `${window.location.origin}/__dooh_media_cache__/${encodeURIComponent(ad.id)}/${ad.checksum}`,
  );
}

async function localAd(
  ad: PlayerManifest["ads"][number],
  download: boolean,
): Promise<CachedAd> {
  if (!("caches" in window)) return { ...ad, localUri: ad.mediaUrl };
  const cache = await caches.open(CACHE_NAME);
  const key = cacheRequest(ad);
  let response = await cache.match(key);
  if (!response && download) {
    try {
      const fetched = await fetch(ad.mediaUrl);
      if (!fetched.ok) return { ...ad, localUri: ad.mediaUrl };
      await cache.put(key, fetched.clone());
      response = fetched;
    } catch {
      return { ...ad, localUri: ad.mediaUrl };
    }
  }
  if (!response) return { ...ad, localUri: ad.mediaUrl };
  const blob = await response.blob();
  return { ...ad, localUri: URL.createObjectURL(blob) };
}

async function hydrate(
  manifest: PlayerManifest,
  download: boolean,
): Promise<CachedManifest> {
  return {
    ...manifest,
    ads: await Promise.all(manifest.ads.map((ad) => localAd(ad, download))),
  };
}

async function pruneCache(manifest: PlayerManifest) {
  if (!("caches" in window)) return;
  const cache = await caches.open(CACHE_NAME);
  const keep = new Set(manifest.ads.map((ad) => cacheRequest(ad).url));
  for (const request of await cache.keys()) {
    if (!keep.has(request.url)) await cache.delete(request);
  }
}

export async function loadCachedManifest(): Promise<CachedManifest | null> {
  const raw = await AsyncStorage.getItem(MANIFEST_KEY);
  if (!raw) return null;
  return hydrate(JSON.parse(raw), false);
}

export async function stageAndPromote(
  manifest: PlayerManifest,
): Promise<CachedManifest> {
  const cached = await hydrate(manifest, false);
  await AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
  await pruneCache(manifest);

  void hydrate(manifest, true)
    .then(() => pruneCache(manifest))
    .catch(() => {
      // Playback can continue from remote URLs while cache warms in the background.
    });

  return cached;
}
