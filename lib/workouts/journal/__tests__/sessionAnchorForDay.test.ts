import { resolveSessionStartedAtIsoForDay } from "../sessionAnchorForDay";

describe("resolveSessionStartedAtIsoForDay", () => {
  const realResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses preferred ISO when it maps to enrichDay in device TZ", () => {
    jest.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      ...realResolvedOptions.call(new Intl.DateTimeFormat()),
      timeZone: "UTC",
    });
    const iso = resolveSessionStartedAtIsoForDay("2026-03-18", "2026-03-18T08:00:00.000Z");
    expect(iso).toBe("2026-03-18T08:00:00.000Z");
  });

  it("falls back to local noon when preferred ISO is on another calendar day", () => {
    jest.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      ...realResolvedOptions.call(new Intl.DateTimeFormat()),
      timeZone: "America/Los_Angeles",
    });
    const iso = resolveSessionStartedAtIsoForDay("2026-03-18", "2026-03-19T08:00:00.000Z");
    const d = new Date(iso);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(18);
    expect(d.getHours()).toBe(12);
  });

  it("returns wall-clock now for invalid enrichDay", () => {
    const before = Date.now();
    const iso = resolveSessionStartedAtIsoForDay("not-a-day", "2026-03-18T08:00:00.000Z");
    const after = Date.now();
    const t = Date.parse(iso);
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
  });
});
