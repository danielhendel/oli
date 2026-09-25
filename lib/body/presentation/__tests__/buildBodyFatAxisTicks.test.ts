import { buildBodyFatAxisTicks } from "@/lib/body/presentation/buildBodyFatAxisTicks";
import { buildBodyFatDetailSharedDomain } from "@/lib/body/presentation/buildBodyFatDetailSharedDomain";

describe("buildBodyFatAxisTicks", () => {
  it("produces clean percentage-point ticks with headroom", () => {
    const axis = buildBodyFatAxisTicks({ minPercent: 16.3, maxPercent: 18.3 });
    expect(axis.status).toBe("ready");
    expect(axis.ticks.length).toBeGreaterThanOrEqual(3);
    expect(axis.domainMinPercent).toBeLessThanOrEqual(16.3);
    expect(axis.domainMaxPercent).toBeGreaterThanOrEqual(18.3);
    // Labels are bare numbers — not hardcoded screenshot values as the only ticks.
    expect(axis.ticks.map((t) => t.label).join(",")).not.toBe("16.3,18.3");
    for (const tick of axis.ticks) {
      expect(tick.valuePercent).toBeGreaterThanOrEqual(axis.domainMinPercent);
      expect(tick.valuePercent).toBeLessThanOrEqual(axis.domainMaxPercent);
    }
  });

  it("uses nice steps (1 / 2 / 5 family)", () => {
    const narrow = buildBodyFatAxisTicks({ minPercent: 17, maxPercent: 18 });
    expect([1, 2, 5]).toContain(narrow.step);

    const wide = buildBodyFatAxisTicks({ minPercent: 10, maxPercent: 35 });
    expect(wide.step).toBeGreaterThanOrEqual(2);
    expect(wide.ticks.length).toBeLessThanOrEqual(6);
  });

  it("returns unavailable for invalid input", () => {
    expect(buildBodyFatAxisTicks({ minPercent: NaN, maxPercent: 10 }).status).toBe(
      "unavailable",
    );
    expect(buildBodyFatAxisTicks({ minPercent: -1, maxPercent: 10 }).status).toBe(
      "unavailable",
    );
  });
});

describe("buildBodyFatDetailSharedDomain", () => {
  it("locks one domain from full history", () => {
    const valuesPercent = [16.3, 17.1, 18.3, 17.4];
    const shared = buildBodyFatDetailSharedDomain({ valuesPercent });
    expect(shared.status).toBe("ready");
    expect(shared.domainMinPercent).toBeLessThanOrEqual(16.3);
    expect(shared.domainMaxPercent).toBeGreaterThanOrEqual(18.3);

    const again = buildBodyFatDetailSharedDomain({ valuesPercent });
    expect(again.ticks.map((t) => t.valuePercent)).toEqual(
      shared.ticks.map((t) => t.valuePercent),
    );
  });
});
