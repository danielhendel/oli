import { buildWeightAxisTicks } from "@/lib/body/presentation/buildWeightAxisTicks";

describe("buildWeightAxisTicks", () => {
  it("uses clean 5 lb increments for the Stage 3C example range", () => {
    // 162.1–166.5 lb → kg
    const minKg = 162.1 / 2.2046226218;
    const maxKg = 166.5 / 2.2046226218;
    const model = buildWeightAxisTicks({ minKg, maxKg, unit: "lb" });
    expect(model.status).toBe("ready");
    expect(model.step).toBe(5);
    expect(model.ticks.map((t) => t.valueDisplay)).toEqual([160, 165, 170]);
    expect(model.ticks.every((t) => t.label === String(t.valueDisplay))).toBe(true);
  });

  it("pads when observed values land exactly on tick boundaries", () => {
    const minKg = 160 / 2.2046226218;
    const maxKg = 170 / 2.2046226218;
    const model = buildWeightAxisTicks({ minKg, maxKg, unit: "lb" });
    expect(model.status).toBe("ready");
    const displays = model.ticks.map((t) => t.valueDisplay);
    expect(displays[0]).toBeLessThan(160);
    expect(displays[displays.length - 1]).toBeGreaterThan(170);
  });

  it("expands narrow ranges to at least two 5 lb intervals", () => {
    const minKg = 164.1 / 2.2046226218;
    const maxKg = 164.4 / 2.2046226218;
    const model = buildWeightAxisTicks({ minKg, maxKg, unit: "lb" });
    expect(model.step % 5).toBe(0);
    expect(model.ticks.length).toBeGreaterThanOrEqual(3);
    const span =
      model.ticks[model.ticks.length - 1]!.valueDisplay - model.ticks[0]!.valueDisplay;
    expect(span).toBeGreaterThanOrEqual(10);
  });

  it("handles one point without a zero floor", () => {
    const kg = 74.3;
    const model = buildWeightAxisTicks({ minKg: kg, maxKg: kg, unit: "lb" });
    expect(model.status).toBe("ready");
    expect(model.domainMinKg).toBeGreaterThan(0);
    expect(model.ticks.length).toBeGreaterThanOrEqual(3);
  });

  it("uses clean 2 kg increments in metric mode", () => {
    const model = buildWeightAxisTicks({ minKg: 73.2, maxKg: 75.8, unit: "kg" });
    expect(model.status).toBe("ready");
    expect(model.step % 2).toBe(0);
    expect(model.ticks.every((t) => t.valueDisplay % model.step === 0)).toBe(true);
    expect(model.ticks[0]!.valueDisplay).toBeLessThanOrEqual(72);
    expect(model.ticks[model.ticks.length - 1]!.valueDisplay).toBeGreaterThanOrEqual(76);
  });

  it("widens step in multiples of 5 lb for broad ranges", () => {
    const minKg = 140 / 2.2046226218;
    const maxKg = 200 / 2.2046226218;
    const model = buildWeightAxisTicks({ minKg, maxKg, unit: "lb" });
    expect(model.step % 5).toBe(0);
    expect(model.ticks.length).toBeLessThanOrEqual(6);
    expect(model.ticks.length).toBeGreaterThanOrEqual(3);
  });

  it("returns unavailable for non-finite / non-positive input", () => {
    expect(
      buildWeightAxisTicks({ minKg: Number.NaN, maxKg: 70, unit: "lb" }).status,
    ).toBe("unavailable");
    expect(buildWeightAxisTicks({ minKg: 0, maxKg: 70, unit: "kg" }).status).toBe(
      "unavailable",
    );
    expect(buildWeightAxisTicks({ minKg: -1, maxKg: 70, unit: "lb" }).ticks).toEqual([]);
  });

  it("is deterministic across repeated calls", () => {
    const input = { minKg: 73.5, maxKg: 75.5, unit: "lb" as const };
    expect(buildWeightAxisTicks(input)).toEqual(buildWeightAxisTicks(input));
  });
});
