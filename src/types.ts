import type { PlayerManifest } from "@dooh/shared";

export type PlayerSettings = {
  apiBaseUrl: string;
  screenCode: string;
  deviceId: string;
  deviceToken: string;
};

export type CachedAd = PlayerManifest["ads"][number] & {
  localUri: string;
};

export type CachedManifest = Omit<PlayerManifest, "ads"> & {
  ads: CachedAd[];
};

export type QueuedError = {
  errorType: string;
  errorMessage: string;
  details?: Record<string, unknown>;
  occurredAt: string;
};
