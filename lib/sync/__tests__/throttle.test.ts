import { shouldRun, nowIso } from "../throttle";

describe("throttle", () => {
  describe("shouldRun", () => {
    it("returns true when lastIso is null", () => {
      expect(shouldRun(null, 60_000, 1000)).toBe(true);
    });

    it("returns false when last run is recent (within minIntervalMs)", () => {
      const now = 10_000;
      const lastIso = new Date(now - 30_000).toISOString(); // 30s ago
      expect(shouldRun(lastIso, 60_000, now)).toBe(false);
    });

    it("returns true when last run is old (>= minIntervalMs ago)", () => {
      const now = 70_000;
      const lastIso = new Date(0).toISOString(); // 70s ago
      expect(shouldRun(lastIso, 60_000, now)).toBe(true);
    });

    it("returns false when lastIso is invalid (fail-closed)", () => {
      expect(shouldRun("not-a-date", 60_000, 1000)).toBe(false);
      expect(shouldRun("", 60_000, 1000)).toBe(false);
    });
  });

  describe("nowIso", () => {
    it("returns ISO string for given ms", () => {
      const ms = 1709308800000; // fixed timestamp
      const iso = nowIso(ms);
      expect(iso).toBe(new Date(ms).toISOString());
      expect(() => new Date(iso).toISOString()).not.toThrow();
    });

    it("uses Date.now() when no argument", () => {
      const before = Date.now();
      const iso = nowIso();
      const after = Date.now();
      const t = new Date(iso).getTime();
      expect(t).toBeGreaterThanOrEqual(before);
      expect(t).toBeLessThanOrEqual(after + 1);
    });
  });
});
