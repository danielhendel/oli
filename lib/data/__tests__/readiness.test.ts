// lib/data/__tests__/readiness.test.ts
import { isFreshComputedAt } from "../readiness";

describe("isFreshComputedAt", () => {
  it("returns false when computedAt missing", () => {
    expect(isFreshComputedAt({ computedAtIso: null, latestEventAtIso: "2025-12-30T10:00:00.000Z" })).toBe(false);
  });

  it("returns true when no latestEventAt (no events)", () => {
    expect(isFreshComputedAt({ computedAtIso: "2025-12-30T10:00:00.000Z", latestEventAtIso: null })).toBe(true);
  });

  it("returns true when computedAt >= latestEventAt", () => {
    expect(
      isFreshComputedAt({
        computedAtIso: "2025-12-30T10:00:01.000Z",
        latestEventAtIso: "2025-12-30T10:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("returns false when computedAt < latestEventAt", () => {
    expect(
      isFreshComputedAt({
        computedAtIso: "2025-12-30T09:59:59.000Z",
        latestEventAtIso: "2025-12-30T10:00:00.000Z",
      }),
    ).toBe(false);
  });
});
