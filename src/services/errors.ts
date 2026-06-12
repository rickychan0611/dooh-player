import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PlayerSettings, QueuedError } from "../types";
import { sendPlayerError } from "./api";

const KEY = "dooh:error-queue";
const LIMIT = 50;

export async function queueError(error: Omit<QueuedError, "occurredAt">) {
  const queue = await readQueue();
  queue.push({ ...error, occurredAt: new Date().toISOString() });
  await AsyncStorage.setItem(KEY, JSON.stringify(queue.slice(-LIMIT)));
}

async function readQueue(): Promise<QueuedError[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function flushErrors(settings: PlayerSettings) {
  const queue = await readQueue();
  const remaining = [];
  for (const error of queue) {
    try {
      await sendPlayerError(settings, error);
    } catch {
      remaining.push(error);
    }
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(remaining));
}
