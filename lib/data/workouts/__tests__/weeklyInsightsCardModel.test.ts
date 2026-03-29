import { buildWeeklyInsightsCardModel } from "@/lib/data/workouts/weeklyInsightsCardModel";
import type { WeeklyStrengthCardModel } from "@/lib/data/workouts/weeklyStrengthCardModel";
import type { MuscleGroup } from "@/lib/workouts/exercises/taxonomy";

function stubModel(options: {
  muscleVolumes?: Partial<Record<MuscleGroup, number>>;
  totalVolume?: number;
  totalWorkouts?: number;
  weekKey?: string;
}): WeeklyStrengthCardModel {
  const muscleVolumes = options.muscleVolumes ?? {};
  const muscleGroups = (Object.entries(muscleVolumes) as [MuscleGroup, number][])
    .filter(([, v]) => v > 0)
    .map(([muscleGroup, totalVolume]) => ({ muscleGroup, totalVolume }))
    .sort((a, b) => b.totalVolume - a.totalVolume);
  const totalVolume =
    options.totalVolume ?? muscleGroups.reduce((s, r) => s + r.totalVolume, 0);
  return {
    weekKey: options.weekKey ?? "w",
    totalWorkouts: options.totalWorkouts ?? 2,
    totalVolume,
    workouts: [],
    muscleGroups,
    muscleGroupsSets: [],
  };
}

describe("buildWeeklyInsightsCardModel", () => {
  it("emits a balance insight when a related pair exceeds the imbalance ratio", () => {
    const current = stubModel({
      muscleVolumes: { quads: 1800, hamstrings: 900 },
      totalVolume: 2700,
    });
    const prev = stubModel({
      muscleVolumes: { quads: 1000, hamstrings: 900 },
      totalVolume: 1900,
    });
    const out = buildWeeklyInsightsCardModel(current, prev);
    const balance = out.insights.find((i) => i.kind === "balance");
    expect(balance).toBeDefined();
    expect(balance!.message).toContain("Quads");
    expect(balance!.message).toContain("hamstrings");
    expect(balance!.message).toMatch(/2\.0×/);
    expect(balance!.destination.section).toBe("weekly_muscle_group");
    expect(balance!.destination.emphasis).toBe("balance");
    expect(balance!.destination.muscleGroup).toBe("quads");
  });

  it("emits a trend insight when total volume swings vs last week beyond the threshold", () => {
    const current = stubModel({
      muscleVolumes: { chest: 500, back: 500 },
      totalVolume: 1250,
    });
    const prev = stubModel({
      muscleVolumes: { chest: 400, back: 400 },
      totalVolume: 1000,
    });
    const out = buildWeeklyInsightsCardModel(current, prev);
    const trend = out.insights.find((i) => i.kind === "trend" && i.message.includes("Total strength volume"));
    expect(trend).toBeDefined();
    expect(trend!.message).toContain("25%");
    expect(trend!.message).toContain("up");
    expect(trend!.destination.section).toBe("weekly_strength");
    expect(trend!.destination.emphasis).toBe("trend");
  });

  it("emits a focus insight when calves have no volume but lower-body work exists", () => {
    const current = stubModel({
      muscleVolumes: { quads: 800, hamstrings: 400, glutes: 200, calves: 0 },
      totalVolume: 6500,
    });
    const prev = stubModel({ totalVolume: 6000, muscleVolumes: { quads: 700 } });
    const out = buildWeeklyInsightsCardModel(current, prev);
    const focus = out.insights.find((i) => i.kind === "focus" && i.message.includes("calf"));
    expect(focus).toBeDefined();
    expect(focus!.destination.section).toBe("weekly_muscle_group");
    expect(focus!.destination.emphasis).toBe("focus");
    expect(focus!.destination.muscleGroup).toBe("calves");
  });

  it("returns at most three insights and prioritizes higher-impact items", () => {
    const current = stubModel({
      muscleVolumes: {
        quads: 2000,
        hamstrings: 800,
        chest: 900,
        back: 400,
        calves: 0,
        shoulders: 600,
      },
      totalVolume: 12_000,
    });
    const prev = stubModel({
      muscleVolumes: { quads: 1200, hamstrings: 900, chest: 500, back: 450, shoulders: 200 },
      totalVolume: 6000,
    });
    const out = buildWeeklyInsightsCardModel(current, prev);
    expect(out.insights.length).toBeLessThanOrEqual(3);
    const kinds = out.insights.map((i) => i.kind);
    expect(new Set(kinds).size).toBeGreaterThan(0);
    for (const row of out.insights) {
      expect(row.destination.section).toMatch(
        /weekly_strength|weekly_muscle_group|monthly_workouts|yearly_workouts/,
      );
    }
  });

  it("uses a calm fallback when the week has no logged training", () => {
    const current = stubModel({
      totalWorkouts: 0,
      totalVolume: 0,
      muscleVolumes: {},
    });
    const out = buildWeeklyInsightsCardModel(current, null);
    expect(out.insights).toHaveLength(0);
    expect(out.fallbackMessage.toLowerCase()).toContain("log");
  });

  it("uses a positive fallback when there is volume but no strong insight fires", () => {
    const current = stubModel({
      muscleVolumes: { shoulders: 150, forearms: 130 },
      totalVolume: 500,
      totalWorkouts: 1,
    });
    const prev = stubModel({
      muscleVolumes: { shoulders: 140, forearms: 125 },
      totalVolume: 480,
    });
    const out = buildWeeklyInsightsCardModel(current, prev);
    expect(out.insights).toHaveLength(0);
    expect(out.fallbackMessage).toMatch(/nice work|consistency/i);
  });

  it("emits a per-muscle trend when a group moves sharply week over week", () => {
    const current = stubModel({
      muscleVolumes: { back: 700, chest: 400 },
      totalVolume: 1100,
    });
    const prev = stubModel({
      muscleVolumes: { back: 1000, chest: 400 },
      totalVolume: 1400,
    });
    const out = buildWeeklyInsightsCardModel(current, prev);
    const trend = out.insights.find((i) => i.kind === "trend" && i.message.includes("Back"));
    expect(trend).toBeDefined();
    expect(trend!.message).toContain("down");
    expect(trend!.message).toContain("30%");
    expect(trend!.destination.section).toBe("weekly_muscle_group");
    expect(trend!.destination.muscleGroup).toBe("back");
  });
});
