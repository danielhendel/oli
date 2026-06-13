import { buildProgrammingPrescription } from "@/lib/data/program/buildProgrammingPrescription";
import {
  buildProgramOverviewMetrics,
  type ProgramMetricExplainer,
} from "@/lib/data/program/programOverviewMetricExplainers";
import type { ProgrammingInputs } from "@/lib/data/program/programmingEngineTypes";

const SAMPLE_INPUTS: ProgrammingInputs = {
  sex: "male",
  age: 28,
  trainingLevel: "intermediate",
  trainingDays: 4,
  goal: "build_muscle",
  trainingType: "hypertrophy",
};

const EXPLAINER_KEYS: (keyof ProgramMetricExplainer)[] = [
  "title",
  "currentValue",
  "whatIsIt",
  "whyItMatters",
  "whatYourValueMeans",
  "howToUseIt",
  "whatToWatchNext",
];

describe("buildProgramOverviewMetrics", () => {
  const prescription = buildProgrammingPrescription(SAMPLE_INPUTS);
  const metrics = buildProgramOverviewMetrics(prescription);

  it("returns six metrics in display order", () => {
    expect(metrics.map((m) => m.id)).toEqual([
      "total_weekly_sets",
      "frequency",
      "rep_range",
      "rir_target",
      "rpe_target",
      "progression",
    ]);
  });

  it("gives every metric a complete five-part structured explainer", () => {
    for (const metric of metrics) {
      for (const key of EXPLAINER_KEYS) {
        expect(typeof metric.explainer[key]).toBe("string");
        expect(metric.explainer[key].length).toBeGreaterThan(0);
      }
    }
  });

  it("interpolates the generated value into each explainer", () => {
    const total = metrics.find((m) => m.id === "total_weekly_sets")!;
    expect(total.value).toBe(String(prescription.totalWeeklySets));
    expect(total.explainer.whatIsIt).toContain("hard working set");
    expect(total.explainer.whatIsIt.toLowerCase()).toContain("weekly training workload");
    expect(total.explainer.whatYourValueMeans).toContain(String(prescription.totalWeeklySets));

    const rir = metrics.find((m) => m.id === "rir_target")!;
    expect(rir.explainer.whatIsIt).toContain("Reps In Reserve");
    expect(rir.explainer.whatYourValueMeans).toContain(prescription.headline.rirTarget);

    const rpe = metrics.find((m) => m.id === "rpe_target")!;
    expect(rpe.explainer.whatIsIt).toContain("1–10");

    const progression = metrics.find((m) => m.id === "progression")!;
    expect(progression.explainer.whatIsIt).toContain(prescription.progressionModel);
    expect(progression.explainer.whatToWatchNext.toLowerCase()).toContain("each week");
  });
});
