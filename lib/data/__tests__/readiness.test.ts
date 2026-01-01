// lib/data/__tests__/readiness.test.ts
import { isCompatiblePipelineVersion, isFreshComputedAt } from "../readiness";

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

  it("returns false when computedAt is invalid", () => {
    expect(isFreshComputedAt({ computedAtIso: "not-a-date", latestEventAtIso: "2025-12-30T10:00:00.000Z" })).toBe(
      false,
    );
  });

  it("returns false when latestEventAt is invalid", () => {
    expect(isFreshComputedAt({ computedAtIso: "2025-12-30T10:00:00.000Z", latestEventAtIso: "not-a-date" })).toBe(
      false,
    );
  });
});

describe("isCompatiblePipelineVersion", () => {
  it("returns false when pipelineVersion missing", () => {
    expect(isCompatiblePipelineVersion({ pipelineVersion: null, expectedPipelineVersion: 1 })).toBe(false);
  });

  it("returns false when pipelineVersion undefined", () => {
    expect(isCompatiblePipelineVersion({ pipelineVersion: undefined, expectedPipelineVersion: 1 })).toBe(false);
  });

  it("returns true when versions match", () => {
    expect(isCompatiblePipelineVersion({ pipelineVersion: 1, expectedPipelineVersion: 1 })).toBe(true);
  });

  it("returns false when versions differ", () => {
    expect(isCompatiblePipelineVersion({ pipelineVersion: 2, expectedPipelineVersion: 1 })).toBe(false);
  });
});
