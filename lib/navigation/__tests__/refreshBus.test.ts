// lib/navigation/__tests__/refreshBus.test.ts
import {
    __testing_reset,
    __testing_setStorage,
    emitRefresh,
    subscribeRefresh,
    consumeRefresh,
  } from "@/lib/navigation/refreshBus";
  
  function createMemoryStorage() {
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
      _dump() {
        return new Map(map);
      },
    };
  }
  
  describe("refreshBus", () => {
    beforeEach(() => {
      __testing_reset();
      __testing_setStorage(createMemoryStorage());
    });
  
    afterEach(() => {
      __testing_setStorage(null);
      __testing_reset();
    });
  
    test("delivers immediately to active subscribers", () => {
      const seen: string[] = [];
      const unsub = subscribeRefresh((ev) => {
        if (ev.topic === "commandCenter") seen.push(ev.key);
      });
  
      emitRefresh("commandCenter", "k1");
      emitRefresh("commandCenter", "k2");
  
      unsub();
      expect(seen).toEqual(["k1", "k2"]);
    });
  
    test("replays pending events to late subscribers", () => {
      const seen: string[] = [];
  
      emitRefresh("commandCenter", "k1");
      emitRefresh("commandCenter", "k2");
  
      const unsub = subscribeRefresh((ev) => {
        if (ev.topic === "commandCenter") seen.push(ev.key);
      });
  
      unsub();
      expect(seen).toEqual(["k1", "k2"]);
    });
  
    test("consumeRefresh acks exactly-once (no replay after consume)", () => {
      emitRefresh("commandCenter", "k1");
  
      consumeRefresh("commandCenter", "k1");
  
      const seen: string[] = [];
      const unsub = subscribeRefresh((ev) => {
        if (ev.topic === "commandCenter") seen.push(ev.key);
      });
  
      unsub();
      expect(seen).toEqual([]);
    });
  });
  