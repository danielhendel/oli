import { buildObservedDateExtent } from "@/lib/body/presentation/buildObservedDateExtent";

describe("buildObservedDateExtent", () => {
  it("uses actual observation timestamps, not a requested period", () => {
    const extent = buildObservedDateExtent([
      { observedAt: "2025-09-22T12:00:00.000Z", dayKey: "2025-09-22" },
      { observedAt: "2026-03-01T12:00:00.000Z", dayKey: "2026-03-01" },
      { observedAt: "2026-09-16T12:00:00.000Z", dayKey: "2026-09-16" },
    ]);
    expect(extent).toEqual({
      firstObservedAt: "2025-09-22T12:00:00.000Z",
      lastObservedAt: "2026-09-16T12:00:00.000Z",
      firstDayKey: "2025-09-22",
      lastDayKey: "2026-09-16",
    });
  });

  it("excludes invalid timestamps", () => {
    const extent = buildObservedDateExtent([
      { observedAt: "not-a-date", dayKey: "2026-01-01" },
      { observedAt: "2026-06-01T12:00:00.000Z", dayKey: "2026-06-01" },
      { observedAt: "2026-09-16T12:00:00.000Z", dayKey: "2026-09-16" },
    ]);
    expect(extent?.firstDayKey).toBe("2026-06-01");
    expect(extent?.lastDayKey).toBe("2026-09-16");
  });

  it("collapses one point to a single day extent", () => {
    const extent = buildObservedDateExtent([
      { observedAt: "2026-09-16T18:00:00.000Z", dayKey: "2026-09-16" },
    ]);
    expect(extent?.firstDayKey).toBe("2026-09-16");
    expect(extent?.lastDayKey).toBe("2026-09-16");
  });

  it("returns null when no valid points exist", () => {
    expect(buildObservedDateExtent([])).toBeNull();
    expect(buildObservedDateExtent([{ observedAt: "bad" }])).toBeNull();
  });
});
