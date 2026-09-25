import { buildWeightDetailSharedDomain } from "@/lib/body/presentation/buildWeightDetailSharedDomain";

describe("buildWeightDetailSharedDomain", () => {
  const LBS_PER_KG = 2.2046226218;

  it("locks 156.1–166.5 lb history to 150/160/170/180 for every selector", () => {
    const valuesKg = [156.1 / LBS_PER_KG, 166.5 / LBS_PER_KG];
    const shared = buildWeightDetailSharedDomain({ valuesKg, unit: "lb" });
    expect(shared.status).toBe("ready");
    expect(shared.ticks.map((t) => t.valueDisplay)).toEqual([150, 160, 170, 180]);

    // Recompute is deterministic — every period selector receives the same ticks.
    expect(
      buildWeightDetailSharedDomain({ valuesKg, unit: "lb" }).ticks.map((t) => t.valueDisplay),
    ).toEqual(shared.ticks.map((t) => t.valueDisplay));
  });

  it("expands shared domain when history includes 184 lb", () => {
    const valuesKg = [156.1 / LBS_PER_KG, 184 / LBS_PER_KG];
    const shared = buildWeightDetailSharedDomain({ valuesKg, unit: "lb" });
    expect(shared.status).toBe("ready");
    const displays = shared.ticks.map((t) => t.valueDisplay);
    expect(displays[0]).toBeLessThanOrEqual(150);
    expect(displays[displays.length - 1]).toBeGreaterThanOrEqual(190);
    // 184 lb must sit inside domain — not clipped.
    const minKg = shared.domainMinKg;
    const maxKg = shared.domainMaxKg;
    expect(184 / LBS_PER_KG).toBeGreaterThanOrEqual(minKg);
    expect(184 / LBS_PER_KG).toBeLessThanOrEqual(maxKg);
  });

  it("uses a clean 5 kg shared domain in metric mode", () => {
    const shared = buildWeightDetailSharedDomain({
      valuesKg: [73.2, 75.8],
      unit: "kg",
    });
    expect(shared.status).toBe("ready");
    expect(shared.step % 5).toBe(0);
    expect(shared.ticks.every((t) => t.valueDisplay % shared.step === 0)).toBe(true);
  });
});
