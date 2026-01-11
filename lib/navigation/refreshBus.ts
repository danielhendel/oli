// lib/navigation/refreshBus.ts
export type RefreshTopic = "commandCenter";

/**
 * Typed per-topic payloads.
 */
export type RefreshPayloadByTopic = {
  commandCenter: {
    optimisticWeightKg?: number;
  };
};

export type RefreshEvent<TTopic extends RefreshTopic = RefreshTopic> = {
  topic: TTopic;
  key: string;
} & RefreshPayloadByTopic[TTopic];

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

let injectedStorage: StorageLike | null = null;
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

// Same-session replay list
let pendingKeys: Record<RefreshTopic, string[]> = {
  commandCenter: [],
};

// Same-session payloads (NOT persisted)
let pendingPayloads: Record<RefreshTopic, Record<string, RefreshPayloadByTopic[RefreshTopic]>> = {
  commandCenter: {},
};

// In-session dedupe
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
  const list = pendingKeys[topic];
  if (list.includes(key)) return;
  pendingKeys[topic] = [...list, key];
}

function removePendingSync(topic: RefreshTopic, key: string): void {
  pendingKeys[topic] = pendingKeys[topic].filter((k) => k !== key);
  delete pendingPayloads[topic][key];
}

function hasPayload(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === "object" && obj !== null && Object.keys(obj as Record<string, unknown>).length > 0;
}

function replayFromMemory(cb: (ev: RefreshEvent) => void): void {
  const topic: RefreshTopic = "commandCenter";
  for (const key of pendingKeys[topic]) {
    const id = `${topic}:${key}`;
    if (delivered.has(id)) continue;
    delivered.add(id);

    const payload = pendingPayloads[topic][key];
    if (hasPayload(payload)) cb({ topic, key, ...(payload as RefreshPayloadByTopic["commandCenter"]) });
    else cb({ topic, key });
  }
}

export function emitRefresh(
  topic: "commandCenter",
  key: string,
  payload?: RefreshPayloadByTopic["commandCenter"],
): void {
  addPendingSync(topic, key);

  if (hasPayload(payload)) {
    // TS-safe: non-generic write
    pendingPayloads.commandCenter[key] = payload;
  }

  // Persist keys only (payload intentionally not persisted)
  void (async () => {
    const disk = await loadPending(topic);
    if (disk.includes(key)) return;
    await savePending(topic, [...disk, key]);
  })();

  if (hasPayload(payload)) notify({ topic, key, ...(payload as RefreshPayloadByTopic["commandCenter"]) });
  else notify({ topic, key });
}

export function consumeRefresh(topic: RefreshTopic, key: string): void {
  delivered.add(`${topic}:${key}`);
  removePendingSync(topic, key);

  void (async () => {
    const disk = await loadPending(topic);
    await savePending(topic, disk.filter((k) => k !== key));
  })();
}

export function subscribeRefresh(cb: (ev: RefreshEvent) => void): () => void {
  subscribers.add(cb);

  // replay same-session immediately
  replayFromMemory(cb);

  // disk merge/replay (payload-less)
  void (async () => {
    const topic: RefreshTopic = "commandCenter";
    const disk = await loadPending(topic);
    if (!disk.length) return;

    pendingKeys[topic] = Array.from(new Set([...pendingKeys[topic], ...disk]));
    for (const key of disk) {
      const id = `${topic}:${key}`;
      if (delivered.has(id)) continue;
      delivered.add(id);
      cb({ topic, key });
    }
  })();

  return () => {
    subscribers.delete(cb);
  };
}

// --------------------
// Test hooks
// --------------------
export function __testing_setStorage(s: StorageLike | null): void {
  injectedStorage = s;
}
export function __testing_reset(): void {
  subscribers = new Set();
  pendingKeys = { commandCenter: [] };
  pendingPayloads = { commandCenter: {} };
  delivered = new Set();
  injectedStorage = null;
  defaultStorage = null;
  defaultStoragePromise = null;
}
