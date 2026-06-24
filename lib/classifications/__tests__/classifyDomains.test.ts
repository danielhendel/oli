// lib/classifications/__tests__/classifyDomains.test.ts
import {
  classifyActivity,
  classifyBodyComposition,
  classifyCardio,
  classifyLabs,
  classifyNutrition,
  classifyRecovery,
  classifyStrength,
} from "@/lib/classifications/classifyDomains";

describe("classifyDomains", () => {
  it("classifyBodyComposition requires sex for body fat", () => {
    const result = classifyBodyComposition({
      bodyFatPercent: 20,
      bmi: 23,
      sex: null,
    });
    const bf = result.metrics.find((m) => m.metricId === "body-fat-percent");
    expect(bf?.status).toBe("unavailable");
    if (bf?.status === "unavailable") {
      expect(bf.reason).toBe("unsupported_sex");
    }
  });

  it("classifyStrength computes relative bench for men", () => {
    const result = classifyStrength({
      sex: "male",
      benchPressKg: 100,
      squatKg: 150,
      bodyWeightKg: 80,
    });
    const bench = result.metrics.find((m) => m.metricId === "bench-press-bw-male");
    expect(bench?.status).toBe("classified");
    if (bench?.status === "classified") {
      expect(bench.level).toBe(4); // 1.25x
    }
  });

  it("classifyLabs combines blood pressure using worse level", () => {
    const result = classifyLabs({
      hba1cPercent: 5.2,
      systolicBp: 125,
      diastolicBp: 82,
    });
    const combined = result.metrics.find((m) => m.metricId === "blood-pressure-combined");
    expect(combined?.status).toBe("classified");
    if (combined?.status === "classified") {
      expect(combined.level).toBeLessThanOrEqual(3);
    }
  });

  it("classifyRecovery returns unavailable for missing sleep", () => {
    const result = classifyRecovery({});
    expect(result.metrics.every((m) => m.status === "unavailable")).toBe(true);
  });

  it("classifyNutrition classifies protein g/kg", () => {
    const result = classifyNutrition({ proteinGPerKg: 1.6, fiberGPerDay: 35 });
    const protein = result.metrics.find((m) => m.metricId === "protein-g-per-kg");
    expect(protein).toMatchObject({ status: "classified", level: 4 });
  });

  it("classifyActivity classifies weekly minutes at WHO baseline", () => {
    const result = classifyActivity({ dailySteps: 8000, weeklyActivityMinutes: 180 });
    const minutes = result.metrics.find((m) => m.metricId === "weekly-activity-minutes");
    expect(minutes).toMatchObject({ status: "classified", level: 3 });
  });

  it("classifyCardio classifies VO2 by percentile", () => {
    const result = classifyCardio({ restingHeartRateBpm: 55, vo2MaxPercentile: 85 });
    const vo2 = result.metrics.find((m) => m.metricId === "vo2-max-percentile");
    expect(vo2).toMatchObject({ status: "classified", level: 5 });
  });

  it("domain results are deterministic", () => {
    const input = { dailySteps: 10000, weeklyActivityMinutes: 200 };
    expect(classifyActivity(input)).toEqual(classifyActivity(input));
  });
});
