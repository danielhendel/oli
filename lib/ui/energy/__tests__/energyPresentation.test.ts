import { describe, expect, it } from "@jest/globals";
import type { DailyEnergyCardDto } from "@/lib/data/dash/useDailyEnergyCard";
import {
  buildBmrPersonalizedParagraph,
  formatAdditiveEnergyRange,
  formatEnergyRange,
  getEnergyFactorRows,
  getFactorInputsUsedLabels,
  getFactorMissingInputLabels,
} from "@/lib/ui/energy/energyPresentation";

const baseEnergy = (): DailyEnergyCardDto => ({
  modelVersion: "daily_energy_v3",
  computedAt: "2026-05-05T12:00:00.000Z",
  day: "2026-05-05",
  estimatedKcal: { low: 2000, high: 2400, midpoint: 2200 },
  variancePct: 0.1,
  confidence: "moderate",
  factors: {},
  missingRequiredInputs: [],
});

describe("energyPresentation", () => {
  it("formatEnergyRange formats backend numbers without recomputing", () => {
    expect(formatEnergyRange(1517.2, 1710.8)).toBe("1,517–1,711 kcal");
  });

  it("formatAdditiveEnergyRange adds plus prefix only", () => {
    expect(formatAdditiveEnergyRange(390, 528)).toBe("+390–528 kcal");
  });

<<<<<<< HEAD
  it("getEnergyFactorRows includes factor keys only for present contributions", () => {
=======
  it("getEnergyFactorRows omits missing factors", () => {
>>>>>>> origin/main
    const e = baseEnergy();
    e.factors = {
      baseline: { kcalLow: 1500, kcalHigh: 1700 },
      steps: { kcalLow: 300, kcalHigh: 400 },
    };
    const rows = getEnergyFactorRows(e);
    expect(rows.map((r) => r.key)).toEqual(["baseline", "steps"]);
<<<<<<< HEAD
    expect(rows.every((r) => r.displayValue.startsWith("+"))).toBe(true);
=======
    expect(rows.every((r) => r.href.startsWith("/energy/"))).toBe(true);
>>>>>>> origin/main
  });

  it("getEnergyFactorRows omits strength when absent", () => {
    const e = baseEnergy();
    e.factors = {
      baseline: { kcalLow: 1, kcalHigh: 2 },
    };
    expect(getEnergyFactorRows(e).some((r) => r.key === "strength")).toBe(false);
  });

  it("getFactorInputsUsedLabels maps known backend tokens", () => {
    expect(getFactorInputsUsedLabels(["profile.dateOfBirth", "body.weightKg"])).toEqual([
      "Age (from date of birth)",
      "Body weight",
    ]);
  });

  it("getFactorMissingInputLabels maps missing tokens", () => {
    expect(getFactorMissingInputLabels(["body.weightKg"])).toEqual(["Body weight"]);
  });

  it("buildBmrPersonalizedParagraph uses factor range strings only", () => {
    const p = buildBmrPersonalizedParagraph({
      kcalLow: 1517,
      kcalHigh: 1711,
      inputsUsed: [],
      inputsMissing: [],
    });
    expect(p).toContain("+1,517–1,711 kcal");
    expect(p.toLowerCase()).toContain("bmr");
  });
});
