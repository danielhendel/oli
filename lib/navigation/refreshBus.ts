// lib/navigation/refreshBus.ts
export type RefreshTopic = "commandCenter";

export type RefreshEvent = {
  topic: RefreshTopic;
  key: string;
};

type StorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem?(key: string): Promise<void>;
};

const STORAGE_PREFIX = "oli.refreshBus.v1";

function storageKey(topic: RefreshTopic): string {
  return `${STORAGE_PREFIX}:${topic}:pending`;
}

// --------------------
// Storage selection
// --------------------

// Test injection (Jest)
let injectedStorage: StorageLike | null = null;

// Default AsyncStorage loaded lazily (lint-safe)
let defaultStorage: StorageLike | null = null;
let defaultStoragePromise: Promise<StorageLike> | null = null;

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    async getItem(key: string) {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    async setItem(key: string, value: string) {
      map.set(key, value);
    },
    async removeItem(key: string) {
      map.delete(key);
    },
  };
}

async function ensureDefaultStorage(): Promise<StorageLike> {
  if (defaultStorage) return defaultStorage;

  if (!defaultStoragePromise) {
    defaultStoragePromise = (async () => {
      try {
        const mod = await import("@react-native-async-storage/async-storage");
        const s = (mod as unknown as { default?: unknown }).default ?? (mod as unknown);
        if (!s) throw new Error("AsyncStorage unavailable");
        defaultStorage = s as StorageLike;
        return defaultStorage;
      } catch {
        // ✅ Jest / Node safety: fall back to in-memory storage instead of crashing.
        defaultStorage = createMemoryStorage();
        return defaultStorage;
      }
    })();
  }

  return defaultStoragePromise;
}

async function getStorage(): Promise<StorageLike> {
  if (injectedStorage) return injectedStorage;
  return ensureDefaultStorage();
}

// --------------------
// Bus state
// --------------------

let subscribers = new Set<(ev: RefreshEvent) => void>();

// ✅ Same-session source of truth for replay
let pendingByTopic: Record<RefreshTopic, string[]> = {
  commandCenter: [],
};

// In-session dedupe so we don’t double-deliver
let delivered = new Set<string>(); // `${topic}:${key}`

async function loadPending(topic: RefreshTopic): Promise<string[]> {
  const s = await getStorage();
  const raw = await s.getItem(storageKey(topic));
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === "string") as string[];
  } catch {
    return [];
  }
}

async function savePending(topic: RefreshTopic, keys: string[]): Promise<void> {
  const s = await getStorage();
  await s.setItem(storageKey(topic), JSON.stringify(keys));
}

function notify(ev: RefreshEvent): void {
  for (const cb of subscribers) cb(ev);
}

function addPendingSync(topic: RefreshTopic, key: string): void {
  const list = pendingByTopic[topic];
  if (list.includes(key)) return;
  pendingByTopic[topic] = [...list, key];
}

function removePendingSync(topic: RefreshTopic, key: string): void {
  const list = pendingByTopic[topic];
  if (!list.length) return;
  pendingByTopic[topic] = list.filter((k) => k !== key);
}

function replayFromMemory(cb: (ev: RefreshEvent) => void): void {
  const topics: RefreshTopic[] = ["commandCenter"];

  for (const topic of topics) {
    const mem = pendingByTopic[topic];
    for (const key of mem) {
      const id = `${topic}:${key}`;
      if (delivered.has(id)) continue;
      delivered.add(id);
      cb({ topic, key });
    }
  }
}

export function emitRefresh(topic: RefreshTopic, key: string): void {
  // ✅ Same-session replay available immediately
  addPendingSync(topic, key);

  // Persist across restarts (async)
  void (async () => {
    const disk = await loadPending(topic);
    if (disk.includes(key)) return;
    await savePending(topic, [...disk, key]);
  })();

  // Deliver to active subscribers immediately
  notify({ topic, key });
}

export function consumeRefresh(topic: RefreshTopic, key: string): void {
  delivered.add(`${topic}:${key}`);
  removePendingSync(topic, key);

  void (async () => {
    const disk = await loadPending(topic);
    const next = disk.filter((k) => k !== key);
    await savePending(topic, next);
  })();
}

export function subscribeRefresh(cb: (ev: RefreshEvent) => void): () => void {
  subscribers.add(cb);

  // ✅ CRITICAL: replay SAME-SESSION pending synchronously (deterministic)
  replayFromMemory(cb);

  // Then merge + replay disk async (cross-restart)
  void (async () => {
    const topics: RefreshTopic[] = ["commandCenter"];

    for (const topic of topics) {
      const disk = await loadPending(topic);
      if (!disk.length) continue;

      // union into memory
      pendingByTopic[topic] = Array.from(new Set([...pendingByTopic[topic], ...disk]));

      for (const key of disk) {
        const id = `${topic}:${key}`;
        if (delivered.has(id)) continue;
        delivered.add(id);
        cb({ topic, key });
      }
    }
  })();

  return () => {
    subscribers.delete(cb);
  };
}

// --------------------
// Test-only hooks
// --------------------
export function __testing_setStorage(s: StorageLike | null): void {
  injectedStorage = s;
}

export function __testing_reset(): void {
  subscribers = new Set();
  pendingByTopic = { commandCenter: [] };
  delivered = new Set();
  injectedStorage = null;
  defaultStorage = null;
  defaultStoragePromise = null;
}
