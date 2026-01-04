// lib/navigation/__tests__/refreshBus.test.ts
import {
  emitRefresh,
  subscribeRefresh,
  consumeRefresh,
  __testing_reset,
  __testing_setStorage,
} from "../refreshBus";

type StorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem?(key: string): Promise<void>;
};

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

describe("refreshBus (commandCenter optimistic payload)", () => {
  beforeEach(() => {
    __testing_reset();
    __testing_setStorage(createMemoryStorage());
  });

  afterEach(() => {
    __testing_reset();
    __testing_setStorage(null);
  });

  test("replays optimisticWeightKg immediately to late subscribers (same-session invariant)", () => {
    const refreshKey = "rk-123";

    // Emit BEFORE subscribing: simulates CC mounted + router behavior not remounting,
    // then subscriber attaches later and must still receive the optimistic payload.
    emitRefresh("commandCenter", refreshKey, { optimisticWeightKg: 74 });

    const received: { key: string; optimisticWeightKg?: number }[] = [];
    const unsub = subscribeRefresh((ev) => {
      if (ev.topic !== "commandCenter") return;
      received.push({ key: ev.key, optimisticWeightKg: ev.optimisticWeightKg });
    });

    expect(received).toHaveLength(1);
    expect(received[0]?.key).toBe(refreshKey);
    expect(received[0]?.optimisticWeightKg).toBe(74);

    unsub();
  });

  test("delivers optimisticWeightKg to active subscribers immediately", () => {
    const refreshKey = "rk-456";

    const received: { key: string; optimisticWeightKg?: number }[] = [];
    const unsub = subscribeRefresh((ev) => {
      if (ev.topic !== "commandCenter") return;
      received.push({ key: ev.key, optimisticWeightKg: ev.optimisticWeightKg });
    });

    emitRefresh("commandCenter", refreshKey, { optimisticWeightKg: 82 });

    expect(received.some((r) => r.key === refreshKey && r.optimisticWeightKg === 82)).toBe(true);

    unsub();
  });

  test("consumeRefresh prevents re-delivery of the same key", () => {
    const refreshKey = "rk-789";

    emitRefresh("commandCenter", refreshKey, { optimisticWeightKg: 90 });

    const received1: number[] = [];
    const unsub1 = subscribeRefresh((ev) => {
      if (ev.topic !== "commandCenter") return;
      if (typeof ev.optimisticWeightKg === "number") received1.push(ev.optimisticWeightKg);
    });

    expect(received1).toEqual([90]);

    // Consume it, then subscribe again — should not replay
    consumeRefresh("commandCenter", refreshKey);

    const received2: number[] = [];
    const unsub2 = subscribeRefresh((ev) => {
      if (ev.topic !== "commandCenter") return;
      if (typeof ev.optimisticWeightKg === "number") received2.push(ev.optimisticWeightKg);
    });

    expect(received2).toEqual([]);

    unsub1();
    unsub2();
  });
});
