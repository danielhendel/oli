import {
  BASE_VOLUME_TABLES,
  expandBaseToCanonical,
  getBaseVolume,
  getBaseVolumeTotal,
  splitCoarseVolume,
} from "@/lib/data/program/programmingEngineBaseVolume";
import {
  TRAINING_TYPE_VOLUME_MULTIPLIER,
  applyVolumeMultiplierToBase,
} from "@/lib/data/program/programmingEngineModifiers";
import {
  getIntensityPrescription,
  getProgressionModel,
  muscleRole,
} from "@/lib/data/program/programmingIntensityRules";
import {
  MAX_SETS_PER_SESSION,
  frequencyForMuscle,
  getWeeklySplitDayNames,
} from "@/lib/data/program/distributeProgrammingVolume";
import {
  buildProgrammingPrescription,
  buildProgrammingPrescriptionFromDraft,
  isProgrammingInputComplete,
  missingProgrammingInputTitles,
} from "@/lib/data/program/buildProgrammingPrescription";
import { buildEmptyWorkoutProgramDesignDraft } from "@/lib/data/program/workoutProgramDesignStore";
import type { ProgrammingInputs } from "@/lib/data/program/programmingEngineTypes";
import type {
  ProgramDesignTrainingLevel,
  ProgramVolumeSex,
} from "@/lib/data/program/workoutProgramDesignTypes";

function sets(prescription: { muscles: { muscleGroupId: string; weeklySets: number }[] }, id: string): number {
  return prescription.muscles.find((m) => m.muscleGroupId === id)?.weeklySets ?? 0;
}

describe("base volume tables (exact)", () => {
  const expectedTotals: Record<ProgramVolumeSex, Record<ProgramDesignTrainingLevel, number>> = {
    male: { beginner: 70, novice: 92, intermediate: 129, advanced: 160, elite: 188 },
    female: { beginner: 79, novice: 103, intermediate: 136, advanced: 162, elite: 194 },
  };

  it("matches the documented sex × level totals", () => {
    for (const sex of ["male", "female"] as ProgramVolumeSex[]) {
      for (const level of Object.keys(expectedTotals[sex]) as ProgramDesignTrainingLevel[]) {
        expect(getBaseVolumeTotal(sex, level)).toBe(expectedTotals[sex][level]);
      }
    }
  });

  it("keeps the requested sex-specific characteristics (female glute bias, male chest bias)", () => {
    expect(BASE_VOLUME_TABLES.female.elite.glutes).toBe(28);
    expect(BASE_VOLUME_TABLES.male.elite.glutes).toBe(12);
    expect(getBaseVolume("male", "intermediate").chest).toBe(14);
    expect(getBaseVolume("female", "intermediate").chest).toBe(10);
  });
});

describe("training-type multipliers (exact)", () => {
  it("matches the documented multiplier table", () => {
    expect(TRAINING_TYPE_VOLUME_MULTIPLIER).toEqual({
      general_fitness: 0.8,
      hypertrophy: 1.0,
      strength: 0.85,
      powerlifting: 0.8,
      athletic_performance: 0.75,
      conditioning: 0.9,
    });
  });

  it("scales each base bucket and rounds to whole sets", () => {
    const scaled = applyVolumeMultiplierToBase(getBaseVolume("male", "intermediate"), 0.85);
    expect(scaled.chest).toBe(12); // 14 * 0.85 = 11.9 → 12
    expect(scaled.side_delts).toBe(9); // 10 * 0.85 = 8.5 → 9
  });
});

describe("chest / back canonical split", () => {
  it("splits evenly and routes the odd extra to the primary group", () => {
    expect(splitCoarseVolume(8, "mid_chest", "upper_chest")).toEqual({
      mid_chest: 4,
      upper_chest: 4,
    });
    expect(splitCoarseVolume(7, "mid_chest", "upper_chest")).toEqual({
      mid_chest: 4,
      upper_chest: 3,
    });
    expect(splitCoarseVolume(7, "lats", "upper_back")).toEqual({ lats: 4, upper_back: 3 });
  });

  it("expands a base table: chest→mid/upper, back→lats/upper_back, others 1:1, rest absent", () => {
    const canonical = expandBaseToCanonical(getBaseVolume("male", "intermediate"));
    expect(canonical.mid_chest).toBe(7);
    expect(canonical.upper_chest).toBe(7);
    expect(canonical.lats).toBe(8);
    expect(canonical.upper_back).toBe(8);
    expect(canonical.quads).toBe(14);
    expect(canonical.forearms).toBeUndefined();
    expect(canonical.neck).toBeUndefined();
  });
});

describe("frequency distribution", () => {
  it("is 0 for untrained muscles", () => {
    expect(frequencyForMuscle(0, 5)).toBe(0);
  });

  it("rises with weekly volume / training days and is capped by training days", () => {
    expect(frequencyForMuscle(6, 2)).toBe(1); // byVolume 1, daysBaseline 1 (<5 days)
    expect(frequencyForMuscle(6, 5)).toBe(2); // daysBaseline lifts low-volume freq to 2 on 5+ days
    expect(frequencyForMuscle(28, 6)).toBe(4); // ceil(28/9)=4
    expect(frequencyForMuscle(28, 2)).toBe(2); // capped at 2 days (unavoidable)
  });

  it("keeps ≤ MAX_SETS_PER_SESSION per session when training days allow (≥5 days)", () => {
    for (const days of [5, 6]) {
      const rx = buildProgrammingPrescription({
        sex: "female",
        age: null,
        trainingLevel: "elite",
        trainingDays: days,
        goal: null,
        trainingType: "hypertrophy",
      });
      for (const m of rx.muscles) {
        if (m.weeklySets > 0) {
          expect(Math.ceil(m.weeklySets / m.frequencyPerWeek)).toBeLessThanOrEqual(
            MAX_SETS_PER_SESSION,
          );
        }
      }
    }
  });
});

describe("weekly-split day distributions (2–6 days)", () => {
  it("matches the requested split structures", () => {
    expect(getWeeklySplitDayNames(2)).toEqual(["Day 1", "Day 2"]);
    expect(getWeeklySplitDayNames(3)).toEqual(["Day 1", "Day 2", "Day 3"]);
    expect(getWeeklySplitDayNames(4)).toEqual(["Day 1", "Day 2", "Day 3", "Day 4"]);
    expect(getWeeklySplitDayNames(5)).toEqual(["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"]);
    expect(getWeeklySplitDayNames(6)).toEqual([
      "Day 1",
      "Day 2",
      "Day 3",
      "Day 4",
      "Day 5",
      "Day 6",
    ]);
  });

  it("produces one engine day per training day in the prescription", () => {
    const rx = buildProgrammingPrescription({
      sex: "male",
      age: null,
      trainingLevel: "intermediate",
      trainingDays: 4,
      goal: null,
      trainingType: "hypertrophy",
    });
    expect(rx.weeklySplit.dayCount).toBe(4);
    expect(rx.weeklySplit.days.map((d) => d.name)).toEqual(getWeeklySplitDayNames(4));
    expect(rx.weeklySplit.days.every((d) => d.source === "engine")).toBe(true);
  });
});

describe("intensity rules by type + level", () => {
  it("Hypertrophy widens reps and increases failure proximity by level", () => {
    expect(getIntensityPrescription("hypertrophy", "beginner", "primary")).toEqual({
      repRange: "8–15",
      rirTarget: "3",
      rpeTarget: "7",
    });
    expect(getIntensityPrescription("hypertrophy", "elite", "primary")).toEqual({
      repRange: "4–15",
      rirTarget: "0–1",
      rpeTarget: "9–10",
    });
  });

  it("Strength uses lower reps / higher intensity by level", () => {
    expect(getIntensityPrescription("strength", "intermediate", "primary")).toEqual({
      repRange: "3–8",
      rirTarget: "1–2",
      rpeTarget: "8–9",
    });
    expect(getIntensityPrescription("strength", "elite", "primary")).toEqual({
      repRange: "1–5",
      rirTarget: "0–1",
      rpeTarget: "9–10",
    });
  });

  it("Powerlifting splits main lifts vs accessories by role", () => {
    expect(getIntensityPrescription("powerlifting", "intermediate", "primary").repRange).toBe("1–5");
    expect(getIntensityPrescription("powerlifting", "intermediate", "accessory").repRange).toBe(
      "6–12",
    );
  });

  it("Athletic Performance avoids failure (high RIR) and prioritizes quality", () => {
    expect(getIntensityPrescription("athletic_performance", "advanced", "primary")).toEqual({
      repRange: "3–6",
      rirTarget: "2–3",
      rpeTarget: "7",
    });
    expect(getIntensityPrescription("athletic_performance", "advanced", "accessory").rirTarget).toBe(
      "3–4",
    );
  });

  it("Conditioning uses higher reps + sub-failure framing", () => {
    expect(getIntensityPrescription("conditioning", "novice", "primary")).toEqual({
      repRange: "12–20",
      rirTarget: "3–4",
      rpeTarget: "6",
    });
  });

  it("maps progression models per training type", () => {
    expect(getProgressionModel("general_fitness")).toBe("Linear progression");
    expect(getProgressionModel("hypertrophy")).toBe("Double progression");
    expect(getProgressionModel("strength")).toBe("Load progression (top set + back-off)");
    expect(getProgressionModel("powerlifting")).toBe("Percentage / RPE based");
    expect(getProgressionModel("athletic_performance")).toBe("Quality-first progression");
    expect(getProgressionModel("conditioning")).toBe("Density progression");
  });

  it("classifies compound vs accessory muscle roles", () => {
    expect(muscleRole("quads")).toBe("primary");
    expect(muscleRole("mid_chest")).toBe("primary");
    expect(muscleRole("biceps")).toBe("accessory");
    expect(muscleRole("calves")).toBe("accessory");
  });
});

describe("engine output snapshots", () => {
  it("Male Intermediate Hypertrophy (×1.0): total 129 + correct chest/back split + intensity", () => {
    const rx = buildProgrammingPrescription({
      sex: "male",
      age: 30,
      trainingLevel: "intermediate",
      trainingDays: 4,
      goal: null,
      trainingType: "hypertrophy",
    });
    expect(rx.totalWeeklySets).toBe(129);
    expect(sets(rx, "mid_chest")).toBe(7);
    expect(sets(rx, "upper_chest")).toBe(7);
    expect(sets(rx, "lats")).toBe(8);
    expect(sets(rx, "upper_back")).toBe(8);
    expect(rx.progressionModel).toBe("Double progression");
    const quads = rx.muscles.find((m) => m.muscleGroupId === "quads");
    expect(quads?.repRange).toBe("5–15");
    expect(quads?.rirTarget).toBe("1–2");
    expect(rx.headline.repRange).toBe("5–15");
  });

  it("Male Intermediate Strength (×0.85): reduced total + strength rep range", () => {
    const rx = buildProgrammingPrescription({
      sex: "male",
      age: 30,
      trainingLevel: "intermediate",
      trainingDays: 4,
      goal: null,
      trainingType: "strength",
    });
    expect(rx.totalWeeklySets).toBe(113);
    expect(rx.progressionModel).toBe("Load progression (top set + back-off)");
    const quads = rx.muscles.find((m) => m.muscleGroupId === "quads");
    expect(quads?.repRange).toBe("3–8");
  });

  it("Female Advanced Athletic Performance (×0.75): reduced total + quality intensity", () => {
    const rx = buildProgrammingPrescription({
      sex: "female",
      age: 26,
      trainingLevel: "advanced",
      trainingDays: 5,
      goal: null,
      trainingType: "athletic_performance",
    });
    expect(rx.totalWeeklySets).toBe(124);
    expect(rx.progressionModel).toBe("Quality-first progression");
    const quads = rx.muscles.find((m) => m.muscleGroupId === "quads");
    expect(quads?.repRange).toBe("3–6"); // primary role
    const biceps = rx.muscles.find((m) => m.muscleGroupId === "biceps");
    expect(biceps?.repRange).toBe("1–5"); // accessory role
  });

  it("keeps non-template groups at 0 and marks all engine-sourced", () => {
    const rx = buildProgrammingPrescription({
      sex: "male",
      age: null,
      trainingLevel: "beginner",
      trainingDays: 3,
      goal: null,
      trainingType: "hypertrophy",
    });
    expect(sets(rx, "forearms")).toBe(0);
    expect(sets(rx, "neck")).toBe(0);
    expect(rx.muscles.every((m) => m.source === "engine")).toBe(true);
  });

  it("training days change distribution, not total volume", () => {
    const base: Omit<ProgrammingInputs, "trainingDays"> = {
      sex: "male",
      age: null,
      trainingLevel: "intermediate",
      goal: null,
      trainingType: "hypertrophy",
    };
    const threeDay = buildProgrammingPrescription({ ...base, trainingDays: 3 });
    const sixDay = buildProgrammingPrescription({ ...base, trainingDays: 6 });
    expect(threeDay.totalWeeklySets).toBe(sixDay.totalWeeklySets);
    expect(sixDay.frequencyRange.max).toBeGreaterThanOrEqual(threeDay.frequencyRange.max);
  });

  it("is deterministic: same inputs ⇒ identical output", () => {
    const inputs: ProgrammingInputs = {
      sex: "female",
      age: 40,
      trainingLevel: "novice",
      trainingDays: 4,
      goal: "lose_fat",
      trainingType: "conditioning",
    };
    expect(buildProgrammingPrescription(inputs)).toEqual(buildProgrammingPrescription(inputs));
  });
});

describe("manual overrides", () => {
  it("override wins, is flagged manual, and survives input regeneration", () => {
    const inputs: ProgrammingInputs = {
      sex: "male",
      age: null,
      trainingLevel: "intermediate",
      trainingDays: 4,
      goal: null,
      trainingType: "hypertrophy",
    };
    const withOverride = buildProgrammingPrescription(inputs, { muscleVolume: { biceps: 25 } });
    const biceps = withOverride.muscles.find((m) => m.muscleGroupId === "biceps");
    expect(biceps?.weeklySets).toBe(25);
    expect(biceps?.source).toBe("manual");

    // Change training type — overridden biceps stays; non-overridden quads regenerates.
    const regenerated = buildProgrammingPrescription(
      { ...inputs, trainingType: "strength" },
      { muscleVolume: { biceps: 25 } },
    );
    expect(regenerated.muscles.find((m) => m.muscleGroupId === "biceps")?.weeklySets).toBe(25);
    const quadsHyp = withOverride.muscles.find((m) => m.muscleGroupId === "quads")?.weeklySets;
    const quadsStr = regenerated.muscles.find((m) => m.muscleGroupId === "quads")?.weeklySets;
    expect(quadsStr).not.toBe(quadsHyp);
  });

  it("applies split day name overrides and flags them manual", () => {
    const rx = buildProgrammingPrescription(
      {
        sex: "male",
        age: null,
        trainingLevel: "intermediate",
        trainingDays: 3,
        goal: null,
        trainingType: "hypertrophy",
      },
      { splitDayNames: { "day-1": "My Push Day" } },
    );
    expect(rx.weeklySplit.days[0]).toMatchObject({ name: "My Push Day", source: "manual" });
    expect(rx.weeklySplit.days[1]?.source).toBe("engine");
  });
});

describe("draft completeness gating", () => {
  it("requires sex, level, days, and type to generate", () => {
    const draft = buildEmptyWorkoutProgramDesignDraft();
    expect(isProgrammingInputComplete(draft)).toBe(false);
    expect(buildProgrammingPrescriptionFromDraft(draft)).toBeNull();
    expect(missingProgrammingInputTitles(draft)).toEqual([
      "Sex",
      "Training Level",
      "Training Days",
      "Training Type",
    ]);

    const ready = {
      ...draft,
      sex: "male" as const,
      trainingLevel: "intermediate" as const,
      trainingDays: 4,
      trainingType: "hypertrophy" as const,
    };
    expect(isProgrammingInputComplete(ready)).toBe(true);
    expect(missingProgrammingInputTitles(ready)).toEqual([]);
    expect(buildProgrammingPrescriptionFromDraft(ready)?.totalWeeklySets).toBe(129);
  });

  it("threads draft overrides into the generated prescription", () => {
    const draft = {
      ...buildEmptyWorkoutProgramDesignDraft(),
      sex: "male" as const,
      trainingLevel: "intermediate" as const,
      trainingDays: 4,
      trainingType: "hypertrophy" as const,
      muscleVolumeOverrides: { biceps: 20 },
      splitDayNameOverrides: { "day-1": "Custom" },
    };
    const rx = buildProgrammingPrescriptionFromDraft(draft);
    expect(rx?.muscles.find((m) => m.muscleGroupId === "biceps")?.weeklySets).toBe(20);
    expect(rx?.weeklySplit.days[0]?.name).toBe("Custom");
  });
});
