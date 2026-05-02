import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ManualNutritionPayload } from "@/lib/events/manualNutrition";
import { logTrackedMealNutrition } from "@/lib/api/usersMe";
import { trackedMealNutritionIdempotencyKey } from "@/lib/nutrition/trackedMealNutritionPayload";

const STORAGE_KEY = "oli_nutrition_ingest_queue_v1";

export type NutritionQueuedItem = {
  localId: string;
  /** Deterministic idempotency fingerprint (same as HTTP header). */
  idempotencyKey: string;
  payload: ManualNutritionPayload;
  enqueuedAt: string;
  attempts: number;
};

function randomId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function readQueue(): Promise<NutritionQueuedItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as NutritionQueuedItem[];
  } catch {
    return [];
  }
}

async function writeQueue(items: NutritionQueuedItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Offline-first queue for tracked meal POST /ingest payloads.
 * Retries preserve idempotency keys so duplicate taps stay safe server-side.
 */
export const NutritionQueue = {
  async enqueue(payload: ManualNutritionPayload): Promise<void> {
    const items = await readQueue();
    const idempotencyKey = trackedMealNutritionIdempotencyKey(payload);
    if (items.some((x) => x.idempotencyKey === idempotencyKey)) return;
    items.push({
      localId: randomId(),
      idempotencyKey,
      payload,
      enqueuedAt: new Date().toISOString(),
      attempts: 0,
    });
    await writeQueue(items);
  },

  async pendingCount(): Promise<number> {
    const items = await readQueue();
    return items.length;
  },

  async flush(getIdToken: () => Promise<string | null>): Promise<{ flushed: number; failed: number }> {
    const token = await getIdToken();
    if (!token) return { flushed: 0, failed: 0 };

    const items = await readQueue();
    if (items.length === 0) return { flushed: 0, failed: 0 };

    let flushed = 0;
    const remaining: NutritionQueuedItem[] = [];

    for (const item of items) {
      const res = await logTrackedMealNutrition(item.payload, token);
      if (res.ok) {
        flushed += 1;
        continue;
      }
      remaining.push({
        ...item,
        attempts: item.attempts + 1,
      });
    }

    await writeQueue(remaining);
    return { flushed, failed: remaining.length };
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
