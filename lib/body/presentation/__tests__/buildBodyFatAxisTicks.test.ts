import {
  buildBodyFatAxisModel,
  buildBodyFatAxisTicks,
} from "@/lib/body/presentation/buildBodyFatAxisTicks";
import { buildBodyFatDetailSharedDomain } from "@/lib/body/presentation/buildBodyFatDetailSharedDomain";

describe("buildBodyFatAxisTicks — balanced headroom", () => {
  it("acceptance fixture 16.3%–18.3% → 14 / 16 / 18 / 20 step 2", () => {
    const axis = buildBodyFatAxisTicks({ minPercent: 16.3, maxPercent: 18.3 });
    expect(axis.status).toBe("ready");
    expect(axis.step).toBe(2);
    expect(axis.domainMinPercent).toBe(14);
    expect(axis.domainMaxPercent).toBe(20);
    expect(axis.ticks.map((t) => t.valuePercent)).toEqual([14, 16, 18, 20]);
  });

  it("buildBodyFatAxisModel matches the acceptance fixture", () => {
    const model = buildBodyFatAxisModel({ values: [16.3, 18.3] });
    expect(model).toEqual({
      domainMin: 14,
      domainMax: 20,
      ticks: [14, 16, 18, 20],
      step: 2,
    });
  });

  it("one point still yields four balanced ticks", () => {
    const axis = buildBodyFatAxisTicks({ minPercent: 18.2, maxPercent: 18.2 });
    expect(axis.status).toBe("ready");
    expect(axis.step).toBe(2);
    expect(axis.ticks.length).toBeGreaterThanOrEqual(4);
    expect(axis.domainMinPercent).toBeLessThanOrEqual(18.2);
    expect(axis.domainMaxPercent).toBeGreaterThanOrEqual(18.2);
  });

  it("empty / invalid → unavailable", () => {
    expect(buildBodyFatAxisTicks({ minPercent: NaN, maxPercent: 10 }).status).toBe(
      "unavailable",
    );
    expect(buildBodyFatAxisTicks({ minPercent: -1, maxPercent: 10 }).status).toBe(
      "unavailable",
    );
    expect(buildBodyFatAxisTicks({ minPercent: 0, maxPercent: 0 }).status).toBe(
      "unavailable",
    );
    expect(buildBodyFatAxisModel({ values: [NaN, 0, 101, -2] })).toBeNull();
  });

  it("broader range uses larger nice steps", () => {
    const axis = buildBodyFatAxisTicks({ minPercent: 10, maxPercent: 35 });
    expect(axis.status).toBe("ready");
    expect([2, 5, 10]).toContain(axis.step);
    expect(axis.ticks.length).toBeGreaterThanOrEqual(4);
    expect(axis.domainMinPercent).toBeLessThanOrEqual(10);
    expect(axis.domainMaxPercent).toBeGreaterThanOrEqual(35);
  });

  it("expands downward when older lower history appears", () => {
    const narrow = buildBodyFatDetailSharedDomain({
      valuesPercent: [16.3, 18.3],
    });
    expect(narrow.domainMinPercent).toBe(14);

    const wider = buildBodyFatDetailSharedDomain({
      valuesPercent: [12.5, 16.3, 18.3],
    });
    expect(wider.domainMinPercent).toBeLessThanOrEqual(12);
    expect(wider.domainMaxPercent).toBeGreaterThanOrEqual(18.3);
  });

  it("expands upward when higher history appears", () => {
    const wider = buildBodyFatDetailSharedDomain({
      valuesPercent: [16.3, 18.3, 23],
    });
    expect(wider.domainMaxPercent).toBeGreaterThanOrEqual(23);
    expect(wider.domainMinPercent).toBeLessThanOrEqual(16.3);
  });

  it("shared domain ignores invalid values and stays locked for the same extrema", () => {
    const a = buildBodyFatDetailSharedDomain({
      valuesPercent: [16.3, NaN, 0, 101, 18.3],
    });
    const b = buildBodyFatDetailSharedDomain({ valuesPercent: [16.3, 18.3] });
    expect(a.ticks.map((t) => t.valuePercent)).toEqual(b.ticks.map((t) => t.valuePercent));
    expect(a.domainMinPercent).toBe(14);
    expect(a.domainMaxPercent).toBe(20);
  });
});
