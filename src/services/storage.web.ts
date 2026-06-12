export async function getFreeStorageMb(): Promise<number> {
  if (!navigator.storage?.estimate) return 0;
  const estimate = await navigator.storage.estimate();
  if (estimate.quota === undefined || estimate.usage === undefined) return 0;
  return Math.max(
    0,
    Math.round((estimate.quota - estimate.usage) / 1024 / 1024),
  );
}
