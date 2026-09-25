import {
  buildWeightTrendClassificationBands,
  clipWeightTrendBandToDomain,
} from "@/lib/body/presentation/buildWeightTrendClassificationBands";
import { weightKgForBmiAtHeight } from "@/lib/body/standards/cdcWhoAdultBmiScreeningStandard";

describe("buildWeightTrendClassificationBands", () => {
  it("builds continuous kg bands from CDC/WHO BMI cutoffs at height", () => {
    const model = buildWeightTrendClassificationBands({
      heightCm: 170,
      ageYears: 34,
    });
    expect(model.status).toBe("ready");
    if (model.status !== "ready") return;

    expect(model.bands.map((b) => b.id)).toEqual([
      "underweight",
      "healthy_weight",
      "overweight",
      "obesity",
    ]);
    expect(model.bands.map((b) => b.label)).toEqual([
      "Underweight",
      "Healthy Weight",
      "Overweight",
      "Obesity",
    ]);
    expect(model.boundariesKg[0]).toBeCloseTo(weightKgForBmiAtHeight(18.5, 170)!, 5);
    expect(model.boundariesKg[1]).toBeCloseTo(weightKgForBmiAtHeight(25, 170)!, 5);
    expect(model.boundariesKg[2]).toBeCloseTo(weightKgForBmiAtHeight(30, 170)!, 5);
    expect(model.bands[0]!.upperKg).toBe(model.boundariesKg[0]);
    expect(model.bands[1]!.lowerKg).toBe(model.boundariesKg[0]);
    expect(model.bands[1]!.upperKg).toBe(model.boundariesKg[1]);
  });

  it("fails closed without height or under age 20", () => {
    expect(
      buildWeightTrendClassificationBands({ heightCm: null, ageYears: 34 }).status,
    ).toBe("unavailable");
    expect(
      buildWeightTrendClassificationBands({ heightCm: 170, ageYears: 19 }).reason,
    ).toBe("age_ineligible");
  });

  it("clips bands to visible domain", () => {
    const model = buildWeightTrendClassificationBands({
      heightCm: 170,
      ageYears: 34,
    });
    if (model.status !== "ready") throw new Error("expected ready");
    const healthy = model.bands[1]!;
    const clipped = clipWeightTrendBandToDomain({
      band: healthy,
      displayMinKg: healthy.lowerKg! + 1,
      displayMaxKg: healthy.upperKg! - 1,
      softMinKg: model.softExtentKg[0],
      softMaxKg: model.softExtentKg[1],
    });
    expect(clipped).not.toBeNull();
    expect(clipped!.lowerKg).toBeCloseTo(healthy.lowerKg! + 1, 5);
    expect(clipped!.upperKg).toBeCloseTo(healthy.upperKg! - 1, 5);
  });
});
