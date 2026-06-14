const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(
  /\/$/,
  "",
);

export function getApiBaseUrl(): string {
  if (!configuredApiBaseUrl) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE_URL is missing. Add it to .env.local and restart Expo.",
    );
  }
  return configuredApiBaseUrl;
}
