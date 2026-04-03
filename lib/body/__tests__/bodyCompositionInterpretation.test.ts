import { describe, expect, it } from "@jest/globals";
import { defaultUserProfileMain, type UserProfileMain } from "@oli/contracts";
import {
  ageYearsFromProfileDateOfBirth,
  bodyFatBarRange,
  bodyFatFitnessThresholds,
  buildBodyOverviewInterpretations,
  classifyBmi,
  classifyWeightVsHealthyBmiBand,
  healthyWeightBandKg,
  mifflinStJeorBmrKcalPerDay,
} from "../bodyCompositionInterpretation";

function profile(overrides: {
  identity?: Partial<UserProfileMain["identity"]>;
  body?: Partial<UserProfileMain["body"]>;
  bodyInputs?: Partial<UserProfileMain["bodyInputs"]>;
}): UserProfileMain {
  const base = defaultUserProfileMain();
  return {
    ...base,
    identity: { ...base.identity, ...overrides.identity },
    body: { ...base.body, ...overrides.body },
    bodyInputs: { ...base.bodyInputs, ...overrides.bodyInputs },
  };
}

describe("bodyCompositionInterpretation", () => {
  it("classifyBmi uses WHO cutoffs", () => {
    expect(classifyBmi(17)).toBe("underweight");
    expect(classifyBmi(22)).toBe("normal");
    expect(classifyBmi(27)).toBe("overweight");
    expect(classifyBmi(32)).toBe("obese");
  });

  it("ageYearsFromProfileDateOfBirth counts completed years", () => {
    const ref = new Date(2026, 3, 3);
    expect(ageYearsFromProfileDateOfBirth("1996-04-02", ref)).toBe(30);
    expect(ageYearsFromProfileDateOfBirth("1996-04-04", ref)).toBe(29);
  });

  it("mifflinStJeorBmrKcalPerDay matches textbook male example", () => {
    const kcal = mifflinStJeorBmrKcalPerDay({
      weightKg: 80,
      heightCm: 180,
      ageYears: 30,
      sex: "male",
    });
    expect(kcal).toBeCloseTo(1780, 5);
  });

  it("mifflinStJeorBmrKcalPerDay averages formulas for unspecified sex", () => {
    const male = mifflinStJeorBmrKcalPerDay({
      weightKg: 80,
      heightCm: 180,
      ageYears: 30,
      sex: "male",
    });
    const female = mifflinStJeorBmrKcalPerDay({
      weightKg: 80,
      heightCm: 180,
      ageYears: 30,
      sex: "female",
    });
    const mid = mifflinStJeorBmrKcalPerDay({
      weightKg: 80,
      heightCm: 180,
      ageYears: 30,
      sex: "unspecified",
    });
    expect(mid).toBeCloseTo((male + female) / 2, 5);
  });

  it("weight uses generic bar when height missing", () => {
    const ix = buildBodyOverviewInterpretations(profile({}), {
      weightKg: 70,
      bodyFatPercent: null,
      bmi: null,
      leanBodyMassKg: null,
      restingMetabolicRateKcal: null,
    });
    expect(ix.weight.mode).toBe("generic");
    expect(ix.weight.subtitle).toMatch(/height/i);
    expect(ix.weight.progress01).toBeGreaterThan(0);
    expect(ix.weight.progress01).toBeLessThan(1);
  });

  it("weight uses height-informed band when height present", () => {
    const ix = buildBodyOverviewInterpretations(profile({ body: { heightCm: 180 } }), {
      weightKg: 75,
      bodyFatPercent: null,
      bmi: null,
      leanBodyMassKg: null,
      restingMetabolicRateKcal: null,
    });
    expect(ix.weight.mode).toBe("personalized");
    expect(ix.weight.subtitle).toMatch(/18\.5/);
    expect(ix.weight.subtitle).toMatch(/inside the height-based healthy BMI band/i);
    expect(ix.weight.progress01).toBeGreaterThanOrEqual(0);
    expect(ix.weight.progress01).toBeLessThanOrEqual(1);
    expect(ix.weight.subtitle).toMatch(/kg/);
  });

  it("weight healthy range copy uses lb only when massDisplayUnit is lb", () => {
    const ix = buildBodyOverviewInterpretations(
      profile({ body: { heightCm: 180 } }),
      {
        weightKg: 75,
        bodyFatPercent: null,
        bmi: null,
        leanBodyMassKg: null,
        restingMetabolicRateKcal: null,
      },
      { massDisplayUnit: "lb" },
    );
    expect(ix.weight.subtitle).toContain(" lb");
    expect(ix.weight.subtitle).not.toMatch(/\bkg\b/);
  });

  it("each overview metric includes an interpretation bar model", () => {
    const ix = buildBodyOverviewInterpretations(profile({}), {
      weightKg: 70,
      bodyFatPercent: null,
      bmi: null,
      leanBodyMassKg: null,
      restingMetabolicRateKcal: null,
    });
    expect(ix.weight.bar.hasValue).toBe(true);
    expect(ix.weight.bar.displayLabel).toMatch(/Fair|Good|Optimal|Out of range/);
    expect(ix.bmi.bar.hasValue).toBe(false);
    expect(ix.bmi.bar.displayLabel).toBe("No data");
  });

  it("healthyWeightBandKg and classifyWeightVsHealthyBmiBand match BMI 18.5–24.9", () => {
    const { bandLo, bandHi } = healthyWeightBandKg(180);
    expect(bandLo).toBeCloseTo(18.5 * 1.8 * 1.8, 5);
    expect(bandHi).toBeCloseTo(24.9 * 1.8 * 1.8, 5);
    expect(classifyWeightVsHealthyBmiBand(bandLo - 1, 180)).toBe("below");
    expect(classifyWeightVsHealthyBmiBand((bandLo + bandHi) / 2, 180)).toBe("within");
    expect(classifyWeightVsHealthyBmiBand(bandHi + 1, 180)).toBe("above");
  });

  it("weight subtitle says below band when under healthy range", () => {
    const ix = buildBodyOverviewInterpretations(profile({ body: { heightCm: 170 } }), {
      weightKg: 45,
      bodyFatPercent: null,
      bmi: null,
      leanBodyMassKg: null,
      restingMetabolicRateKcal: null,
    });
    expect(ix.weight.subtitle).toMatch(/below that band/i);
  });

  it("weight subtitle says above band when over healthy range", () => {
    const ix = buildBodyOverviewInterpretations(profile({ body: { heightCm: 170 } }), {
      weightKg: 120,
      bodyFatPercent: null,
      bmi: null,
      leanBodyMassKg: null,
      restingMetabolicRateKcal: null,
    });
    expect(ix.weight.subtitle).toMatch(/above that band/i);
  });

  it("BMI adds upper-normal athlete note when normal BMI is high", () => {
    const ix = buildBodyOverviewInterpretations(
      profile({ bodyInputs: { athleteMode: true } }),
      {
        weightKg: null,
        bodyFatPercent: null,
        bmi: 23.5,
        leanBodyMassKg: null,
        restingMetabolicRateKcal: null,
      },
    );
    expect(ix.bmi.subtitle).toMatch(/upper-normal BMI/i);
    expect(ix.bmi.subtitle).toMatch(/WHO/i);
  });

  it("BMI adds athlete caveat when athlete mode and BMI high", () => {
    const ix = buildBodyOverviewInterpretations(
      profile({ bodyInputs: { athleteMode: true } }),
      {
        weightKg: null,
        bodyFatPercent: null,
        bmi: 27,
        leanBodyMassKg: null,
        restingMetabolicRateKcal: null,
      },
    );
    expect(ix.bmi.subtitle).toMatch(/Athlete mode/i);
  });

  it("body fat uses wider fitness band when athlete mode (male)", () => {
    const nonAthlete = buildBodyOverviewInterpretations(
      profile({ identity: { sexAtBirth: "male" }, bodyInputs: { athleteMode: false } }),
      {
        weightKg: null,
        bodyFatPercent: 13,
        bmi: null,
        leanBodyMassKg: null,
        restingMetabolicRateKcal: null,
      },
    );
    const athlete = buildBodyOverviewInterpretations(
      profile({ identity: { sexAtBirth: "male" }, bodyInputs: { athleteMode: true } }),
      {
        weightKg: null,
        bodyFatPercent: 13,
        bmi: null,
        leanBodyMassKg: null,
        restingMetabolicRateKcal: null,
      },
    );
    expect(nonAthlete.bodyFat.subtitle).toMatch(/Below a common/);
    expect(athlete.bodyFat.subtitle).toMatch(/Near a common/);
    expect(athlete.bodyFat.subtitle).toMatch(/Athlete mode/i);
    expect(bodyFatFitnessThresholds("male", false).fitnessLo).toBe(14);
    expect(bodyFatFitnessThresholds("male", true).fitnessLo).toBe(12);
    expect(bodyFatBarRange("male", true).max).toBeGreaterThan(bodyFatBarRange("male", false).max);
  });

  it("body fat is sex-aware for male", () => {
    const ix = buildBodyOverviewInterpretations(
      profile({ identity: { sexAtBirth: "male" } }),
      {
        weightKg: null,
        bodyFatPercent: 15,
        bmi: null,
        leanBodyMassKg: null,
        restingMetabolicRateKcal: null,
      },
    );
    expect(ix.bodyFat.mode).toBe("personalized");
    expect(ix.bodyFat.subtitle).toMatch(/male/i);
  });

  it("body fat prompts for sex when unspecified", () => {
    const ix = buildBodyOverviewInterpretations(
      profile({ identity: { sexAtBirth: "unspecified" } }),
      {
        weightKg: null,
        bodyFatPercent: 20,
        bmi: null,
        leanBodyMassKg: null,
        restingMetabolicRateKcal: null,
      },
    );
    expect(ix.bodyFat.mode).toBe("generic");
    expect(ix.bodyFat.subtitle).toMatch(/sex/i);
  });

  it("RMR asks for profile inputs when baseline cannot be estimated", () => {
    const ix = buildBodyOverviewInterpretations(profile({}), {
      weightKg: null,
      bodyFatPercent: null,
      bmi: null,
      leanBodyMassKg: null,
      restingMetabolicRateKcal: 1600,
    });
    expect(ix.rmr.mode).toBe("generic");
    expect(ix.rmr.subtitle).toMatch(/height/i);
    expect(ix.rmr.progress01).toBe(0.5);
  });

  it("RMR subtitle references inputs used for Mifflin–St Jeor", () => {
    const ix = buildBodyOverviewInterpretations(
      profile({
        body: { heightCm: 180 },
        identity: { dateOfBirth: "1996-04-03", sexAtBirth: "male" },
      }),
      {
        weightKg: 80,
        bodyFatPercent: null,
        bmi: null,
        leanBodyMassKg: null,
        restingMetabolicRateKcal: 1780,
      },
    );
    expect(ix.rmr.subtitle).toMatch(/sex, age, height, weight/i);
  });

  it("RMR compares to Mifflin when profile and weight support it", () => {
    const ix = buildBodyOverviewInterpretations(
      profile({
        body: { heightCm: 180 },
        identity: { dateOfBirth: "1996-04-03", sexAtBirth: "male" },
      }),
      {
        weightKg: 80,
        bodyFatPercent: null,
        bmi: null,
        leanBodyMassKg: null,
        restingMetabolicRateKcal: 1780,
      },
    );
    expect(ix.rmr.mode).toBe("personalized");
    expect(ix.rmr.subtitle).toMatch(/Mifflin/i);
  });

  it("lean mass uses wider athlete tolerance vs weight × (1 − body fat)", () => {
    const w = 80;
    const bf = 20;
    const expected = w * (1 - bf / 100);
    const lean = 0.828 * expected;
    const nonAthlete = buildBodyOverviewInterpretations(profile({ bodyInputs: { athleteMode: false } }), {
      weightKg: w,
      bodyFatPercent: bf,
      bmi: null,
      leanBodyMassKg: lean,
      restingMetabolicRateKcal: null,
    });
    const athlete = buildBodyOverviewInterpretations(profile({ bodyInputs: { athleteMode: true } }), {
      weightKg: w,
      bodyFatPercent: bf,
      bmi: null,
      leanBodyMassKg: lean,
      restingMetabolicRateKcal: null,
    });
    expect(nonAthlete.lean.subtitle).toMatch(/Differs from/);
    expect(athlete.lean.subtitle).toMatch(/Roughly consistent/);
    expect(athlete.lean.subtitle).toMatch(/Athlete mode/i);
  });

  it("lean mass stays conservative without body fat", () => {
    const ix = buildBodyOverviewInterpretations(profile({}), {
      weightKg: 80,
      bodyFatPercent: null,
      bmi: null,
      leanBodyMassKg: 65,
      restingMetabolicRateKcal: null,
    });
    expect(ix.lean.progress01).toBe(0.5);
    expect(ix.lean.subtitle).toMatch(/body fat/i);
  });

  it("lean mass matches generic copy when consistent without athlete tolerance", () => {
    const ix = buildBodyOverviewInterpretations(profile({ bodyInputs: { athleteMode: false } }), {
      weightKg: 80,
      bodyFatPercent: 20,
      bmi: null,
      leanBodyMassKg: 64,
      restingMetabolicRateKcal: null,
    });
    expect(ix.lean.mode).toBe("personalized");
    expect(ix.lean.subtitle).toMatch(/weight × \(1 − body fat\)/);
  });

  it("appends waist-to-height note on weight when waist and height exist", () => {
    const ix = buildBodyOverviewInterpretations(
      profile({
        body: { heightCm: 180 },
        bodyInputs: { waistCircumferenceCm: 95 },
      }),
      {
        weightKg: 75,
        bodyFatPercent: null,
        bmi: null,
        leanBodyMassKg: null,
        restingMetabolicRateKcal: null,
      },
    );
    expect(ix.weight.subtitle).toMatch(/Waist-to-height/i);
  });
});
