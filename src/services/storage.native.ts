import { Paths } from "expo-file-system";

export async function getFreeStorageMb(): Promise<number> {
  return Math.round(Paths.availableDiskSpace / 1024 / 1024);
}
