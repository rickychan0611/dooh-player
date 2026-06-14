import {
  createPairingSessionResponseSchema,
  heartbeatRequestSchema,
  pairingSessionStatusResponseSchema,
  playerManifestSchema,
  type HeartbeatRequest,
} from "../lib/shared";
import type { PlayerSettings, QueuedError } from "../types";

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message ?? `Request failed (${response.status})`);
  }
  return data;
}

export async function testConnection(apiBaseUrl: string) {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/public/screens`);
  if (!response.ok) throw new Error("The API did not respond successfully.");
}

export async function createPairingSession(input: {
  apiBaseUrl: string;
  deviceId: string;
  appVersion: string;
}) {
  const data = await jsonRequest(
    `${input.apiBaseUrl.replace(/\/$/, "")}/api/player/pairing-session`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: input.deviceId,
        appVersion: input.appVersion,
      }),
    },
  );
  return createPairingSessionResponseSchema.parse(data);
}

export async function fetchPairingSessionStatus(
  apiBaseUrl: string,
  pollToken: string,
) {
  const data = await jsonRequest(
    `${apiBaseUrl.replace(/\/$/, "")}/api/player/pairing-session/status`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollToken }),
    },
  );
  return pairingSessionStatusResponseSchema.parse(data);
}

function authorized(settings: PlayerSettings, init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${settings.deviceToken}`,
      "Content-Type": "application/json",
    },
  };
}

export async function fetchManifest(settings: PlayerSettings) {
  const data = await jsonRequest(
    `${settings.apiBaseUrl}/api/player/${encodeURIComponent(settings.screenCode)}/content`,
    authorized(settings),
  );
  return playerManifestSchema.parse(data);
}

export async function sendHeartbeat(settings: PlayerSettings, heartbeat: HeartbeatRequest) {
  heartbeatRequestSchema.parse(heartbeat);
  await jsonRequest(
    `${settings.apiBaseUrl}/api/player/${encodeURIComponent(settings.screenCode)}/heartbeat`,
    authorized(settings, { method: "POST", body: JSON.stringify(heartbeat) }),
  );
}

export async function sendPlayerError(settings: PlayerSettings, error: QueuedError) {
  await jsonRequest(
    `${settings.apiBaseUrl}/api/player/${encodeURIComponent(settings.screenCode)}/error`,
    authorized(settings, {
      method: "POST",
      body: JSON.stringify({ deviceId: settings.deviceId, ...error }),
    }),
  );
}
