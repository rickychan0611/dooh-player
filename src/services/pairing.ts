export function pairingSecondsRemaining(
  expiresAt?: string,
  now = Date.now(),
): number {
  if (!expiresAt) return 0;
  return Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - now) / 1000),
  );
}
