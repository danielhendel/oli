// lib/data/__tests__/resolveReadiness.test.ts
import { resolveReadiness } from "../resolveReadiness";

describe("resolveReadiness", () => {
  const base = {
    network: "ok" as const,
    zodValid: true,
    eventsCount: 1,
    computedAtIso: "2025-12-30T10:00:00.000Z",
    latestCanonicalEventAtIso: "2025-12-30T09:59:00.000Z",
    pipelineVersion: 1,
    expectedPipelineVersion: 1,
  };

  it("returns partial when network is loading", () => {
    expect(resolveReadiness({ ...base, network: "loading" }).state).toBe("partial");
  });

  it("returns error when network is error", () => {
    const r = resolveReadiness({ ...base, network: "error" });
    expect(r.state).toBe("error");
    expect(r.reason).toBe("network-error");
  });

  it("returns missing when no events and no computedAt (truly no data)", () => {
    const r = resolveReadiness({ ...base, eventsCount: 0, computedAtIso: null, latestCanonicalEventAtIso: null });
    expect(r.state).toBe("missing");
    expect(r.reason).toBe("no-events");
  });

  it("returns ready when fact-only (eventsCount=0 but derived truth has computedAt)", () => {
    const r = resolveReadiness({
      ...base,
      eventsCount: 0,
      latestCanonicalEventAtIso: null,
      computedAtIso: "2025-12-30T10:00:00.000Z",
    });
    expect(r.state).toBe("ready");
    expect(r.reason).toBe("ready");
  });

  it("returns partial when payload is not schema-valid", () => {
    const r = resolveReadiness({ ...base, zodValid: false });
    expect(r.state).toBe("partial");
    expect(r.reason).toBe("invalid-payload");
  });

  it("returns partial when meta fields are missing", () => {
    expect(resolveReadiness({ ...base, computedAtIso: null }).reason).toBe("missing-meta");
    expect(resolveReadiness({ ...base, latestCanonicalEventAtIso: null }).reason).toBe("missing-meta");
  });

  it("returns error when pipeline versions mismatch", () => {
    const r = resolveReadiness({ ...base, pipelineVersion: 2 });
    expect(r.state).toBe("error");
    expect(r.reason).toBe("pipeline-version-mismatch");
  });

  it("returns partial when derived truth is stale", () => {
    // computedAt older than latestCanonicalEventAt implies stale
    const r = resolveReadiness({
      ...base,
      computedAtIso: "2025-12-30T09:00:00.000Z",
      latestCanonicalEventAtIso: "2025-12-30T10:00:00.000Z",
    });
    expect(r.state).toBe("partial");
    expect(r.reason).toBe("stale-derived");
  });

  it("returns ready when all checks pass", () => {
    const r = resolveReadiness(base);
    expect(r.state).toBe("ready");
    expect(r.reason).toBe("ready");
  });
});