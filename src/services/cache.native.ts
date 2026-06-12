import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import type { PlayerManifest } from "@dooh/shared";
import type { CachedManifest } from "../types";

const root = new Directory(Paths.document, "dooh-content");
const ACTIVE_KEY = "dooh:active-version";

function versionDirectory(version: number) {
  return new Directory(root, `v${version}`);
}

function extension(url: string) {
  const match = new URL(url).pathname.match(/(\.[a-zA-Z0-9]{2,5})$/);
  return match?.[1] ?? ".media";
}

export async function loadCachedManifest(): Promise<CachedManifest | null> {
  const version = await AsyncStorage.getItem(ACTIVE_KEY);
  if (!version) return null;
  const file = new File(versionDirectory(Number(version)), "manifest.json");
  if (!file.exists) return null;
  return JSON.parse(await file.text());
}

export async function stageAndPromote(manifest: PlayerManifest): Promise<CachedManifest> {
  const current = await loadCachedManifest();
  if (current && current.contentVersion === manifest.contentVersion) {
    const refreshed: CachedManifest = {
      ...manifest,
      ads: current.ads,
    };
    new File(versionDirectory(manifest.contentVersion), "manifest.json").write(
      JSON.stringify(refreshed),
    );
    return refreshed;
  }
  if (!root.exists) root.create({ intermediates: true });

  const staging = new Directory(root, `staging-${manifest.contentVersion}-${Date.now()}`);
  staging.create({ intermediates: true });
  try {
    const ads = [];
    for (const ad of manifest.ads) {
      const destination = new File(staging, `${ad.id}${extension(ad.mediaUrl)}`);
      await File.downloadFileAsync(ad.mediaUrl, destination);
      const digest = Array.from(
        new Uint8Array(
          await Crypto.digest(
            Crypto.CryptoDigestAlgorithm.SHA256,
            await destination.bytes(),
          ),
        ),
        (byte) => byte.toString(16).padStart(2, "0"),
      ).join("");
      if (digest.toLowerCase() !== ad.checksum.toLowerCase()) {
        throw new Error(`Checksum mismatch for ${ad.title}`);
      }
      ads.push({ ...ad, localUri: destination.uri });
    }
    const target = versionDirectory(manifest.contentVersion);
    if (target.exists) target.delete();
    staging.move(target);
    const cached: CachedManifest = {
      ...manifest,
      ads: ads.map((ad) => ({
        ...ad,
        localUri: ad.localUri.replace(staging.uri, target.uri),
      })),
    };
    new File(target, "manifest.json").write(JSON.stringify(cached));
    await AsyncStorage.setItem(ACTIVE_KEY, String(manifest.contentVersion));
    await cleanupVersions(manifest.contentVersion, current?.contentVersion);
    return cached;
  } catch (error) {
    if (staging.exists) staging.delete();
    throw error;
  }
}

async function cleanupVersions(active: number, previous?: number) {
  if (!root.exists) return;
  for (const item of root.list()) {
    if (!(item instanceof Directory)) continue;
    const match = item.name.match(/^v(\d+)$/);
    if (!match) continue;
    const version = Number(match[1]);
    if (version !== active && version !== previous) item.delete();
  }
}
