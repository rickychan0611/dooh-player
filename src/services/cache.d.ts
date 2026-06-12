import type { PlayerManifest } from "@dooh/shared";
import type { CachedManifest } from "../types";

export function loadCachedManifest(): Promise<CachedManifest | null>;
export function stageAndPromote(
  manifest: PlayerManifest,
): Promise<CachedManifest>;
