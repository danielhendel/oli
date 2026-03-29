// lib/data/nutrition/nutritionRecentLoggingStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NutritionRecentLoggingItem } from "@/lib/data/nutrition/buildNutritionRecentLoggingItems";
import {
  dedupeRecentLoggingItems,
  sortRecentLoggingItemsNewestFirst,
} from "@/lib/data/nutrition/buildNutritionRecentLoggingItems";

const VERSION = 1 as const;
const MAX_ITEMS = 25;

type StoredPayload = {
  v: typeof VERSION;
  items: NutritionRecentLoggingItem[];
};

function key(uid: string): string {
  return `nutrition:recentLogging:v${VERSION}:${uid}`;
}

export async function loadNutritionRecentLoggingItems(uid: string): Promise<NutritionRecentLoggingItem[]> {
  if (!uid) return [];
  try {
    const raw = await AsyncStorage.getItem(key(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredPayload;
    if (parsed?.v !== VERSION || !Array.isArray(parsed.items)) return [];
    return sortRecentLoggingItemsNewestFirst(parsed.items);
  } catch {
    return [];
  }
}

export async function appendNutritionRecentLoggingItem(
  uid: string,
  item: NutritionRecentLoggingItem,
): Promise<void> {
  if (!uid) return;
  const prev = await loadNutritionRecentLoggingItems(uid);
  const next = dedupeRecentLoggingItems([item, ...prev]).slice(0, MAX_ITEMS);
  const payload: StoredPayload = { v: VERSION, items: next };
  await AsyncStorage.setItem(key(uid), JSON.stringify(payload));
}
