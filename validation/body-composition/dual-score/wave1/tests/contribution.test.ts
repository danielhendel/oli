import {
  absoluteContribution,
  adverseHide,
  changeContribution,
  changeContributions,
  contributionSummary,
  dominantAdverseConstruct,
  marginalContributionPerConstructPoint,
  reversalIndicator,
  uncertaintyAllocation,
  weightedDeficit,
} from "../src/contribution";
import { ACUTE_SCENARIOS, applyScenario, falseImprovementIndicator, falseImprovementRate, scenarioApplies } from "../src/acute";
import { personaById, personaMasses } from "../src/personas";

describe("§23.17.1 contribution formulas", () => {
  it("absolute / marginal / deficit / change", () => {
    expect(absoluteContribution(0.45, 80)).toBeCloseTo(36, 12);
    expect(marginalContributionPerConstructPoint(0.35)).toBe(0.35);
    expect(weightedDeficit(0.2, 60)).toBeCloseTo(8, 12);
    expect(changeContribution(0.5, 60, 90)).toBeCloseTo(15, 12);
  });
  it("summary: absolute contributions sum to the unclipped aggregate", () => {
    const s = contributionSummary("health", { H1: 80, H2: 92, H3: 92 });
    expect(s.unclippedAggregate).toBeCloseTo(0.45 * 80 + 0.35 * 92 + 0.2 * 92, 12);
    expect(s.rows.map((r) => r.construct)).toEqual(["H1", "H2", "H3"]);
    expect(s.rows[0]!.weightedDeficit).toBeCloseTo(0.45 * 20, 12);
  });
  it("dominantAdverseConstruct = max weighted deficit; ties → earliest in declared order", () => {
    expect(dominantAdverseConstruct("health", { H1: 100, H2: 100, H3: 0 })).toBe("H3");
    expect(dominantAdverseConstruct("health", { H1: 50, H2: 90, H3: 90 })).toBe("H1");
    // exact tie: 0.5*(100-60)=20 vs 0.5*(100-60)=20 → P1
    expect(dominantAdverseConstruct("performance", { P1: 60, P3: 60 })).toBe("P1");
    // Health tie H2 vs H3: 0.35*(100-a) == 0.2*(100-b)  → a=80, b=65 gives 7 vs 7
    expect(dominantAdverseConstruct("health", { H1: 100, H2: 80, H3: 65 })).toBe("H2");
  });
  it("changeContributions sums to the unclipped aggregate change", () => {
    const r = changeContributions("performance", { P1: 60, P3: 80 }, { P1: 70, P3: 50 });
    expect(r.rows).toEqual([
      { construct: "P1", changeContribution: 5 },
      { construct: "P3", changeContribution: -15 },
    ]);
    expect(r.aggregateChange).toBe(-10);
  });
  it("adverse-hide: any construct < 40 while aggregate >= 70", () => {
    expect(adverseHide([39.9, 100, 100], 70)).toBe(true);
    expect(adverseHide([40, 100, 100], 90)).toBe(false);
    expect(adverseHide([10, 100, 100], 69.9)).toBe(false);
  });
});

describe("§23.17.2 reversal indicator", () => {
  it("is 1 only for strictly opposite-sign deltas", () => {
    expect(reversalIndicator(1, -2)).toBe(1);
    expect(reversalIndicator(-0.1, 3)).toBe(1);
    expect(reversalIndicator(1, 2)).toBe(0);
    expect(reversalIndicator(-1, -2)).toBe(0);
  });
  it("any exact zero delta → 0", () => {
    expect(reversalIndicator(0, 5)).toBe(0);
    expect(reversalIndicator(-5, 0)).toBe(0);
    expect(reversalIndicator(0, 0)).toBe(0);
  });
});

describe("§23.17.3 construct uncertainty share", () => {
  it("allocates Var(A) = Σ w_i w_j Cov and shares sum to 1", () => {
    const cov = [
      [4, 1, 0.5],
      [1, 9, -1],
      [0.5, -1, 16],
    ];
    const w = [0.45, 0.35, 0.2];
    const a = uncertaintyAllocation(["H1", "H2", "H3"], w, cov);
    let varA = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) varA += w[i]! * w[j]! * cov[i]![j]!;
    expect(a.varianceOfAggregate).toBeCloseTo(varA, 12);
    expect(a.varianceContribution.reduce((x, y) => x + y, 0)).toBeCloseTo(varA, 12);
    expect(a.constructUncertaintyShare.reduce<number>((x, y) => x + (y ?? 0), 0)).toBeCloseTo(1, 12);
    // vc_0 = w0² Var0 + w0 w1 Cov01 + w0 w2 Cov02
    expect(a.varianceContribution[0]).toBeCloseTo(0.45 ** 2 * 4 + 0.45 * 0.35 * 1 + 0.45 * 0.2 * 0.5, 12);
    expect(a.flags).toEqual([]);
  });
  it("shares may be negative (never clipped)", () => {
    const cov = [
      [1, -0.9],
      [-0.9, 1],
    ];
    const a = uncertaintyAllocation(["P1", "P3"], [0.9, 0.1], cov);
    expect(a.constructUncertaintyShare.some((s) => (s ?? 0) < 0)).toBe(true);
  });
  it("returns null shares + flag when Var(A) <= EPS_NUM", () => {
    const a = uncertaintyAllocation(["P1", "P3"], [0.5, 0.5], [
      [0, 0],
      [0, 0],
    ]);
    expect(a.constructUncertaintyShare).toEqual([null, null]);
    expect(a.flags).toContain("aggregate_variance_near_zero");
  });
});

describe("§23.17.8 false improvement", () => {
  it("indicator: 1 iff scenario − base > EPS_NUM; null when unavailable", () => {
    expect(falseImprovementIndicator(70, 70.1)).toBe(1);
    expect(falseImprovementIndicator(70, 70 + 1e-10)).toBe(0);
    expect(falseImprovementIndicator(70, 69)).toBe(0);
    expect(falseImprovementIndicator(null, 70)).toBeNull();
    expect(falseImprovementIndicator(70, null)).toBeNull();
  });
  it("rate = count(1) / count({0,1}); unavailable reported separately", () => {
    expect(falseImprovementRate([1, 0, null, 1, 0, 0])).toEqual({
      rate: 2 / 5,
      numerator: 2,
      denominator: 5,
      unavailableCount: 1,
    });
    expect(falseImprovementRate([null, null])).toEqual({ rate: null, numerator: 0, denominator: 0, unavailableCount: 2 });
  });
  it("scenario matrix is the frozen table; menstrual scenarios are female-only", () => {
    expect(ACUTE_SCENARIOS.map((s) => s.id)).toEqual([
      "BASE", "HYDRATION_DOWN", "HYDRATION_UP", "GLYCOGEN_DOWN", "GLYCOGEN_UP", "RECENT_EXERCISE",
      "ILLNESS_INFLAMMATION", "EDEMA", "MENSTRUAL_PHASE_LOW", "MENSTRUAL_PHASE_HIGH", "TOD_MORNING", "TOD_EVENING",
    ]);
    const edema = ACUTE_SCENARIOS.find((s) => s.id === "EDEMA")!;
    expect([edema.dFfmKg, edema.dAlmKg, edema.dWaistCm]).toEqual([1.5, 0.9, 2.0]);
    const hu = ACUTE_SCENARIOS.find((s) => s.id === "HYDRATION_DOWN")!;
    expect([hu.dFfmKg, hu.dAlmKg, hu.dWaistCm]).toEqual([-1.0, -0.6, -1.0]);
    const male = personaById("P-01");
    const female = personaById("P-11");
    expect(scenarioApplies(ACUTE_SCENARIOS.find((s) => s.id === "MENSTRUAL_PHASE_HIGH")!, male)).toBe(false);
    expect(scenarioApplies(ACUTE_SCENARIOS.find((s) => s.id === "MENSTRUAL_PHASE_HIGH")!, female)).toBe(true);
  });
  it("applyScenario recomputes FFMI/ALMI at fixed height, leaves FMI unchanged", () => {
    const p = personaById("P-01");
    const m = personaMasses(p);
    const s = ACUTE_SCENARIOS.find((x) => x.id === "EDEMA")!;
    const r = applyScenario(p, s);
    const hm2 = (p.heightCm / 100) ** 2;
    expect(r.ffmi).toBeCloseTo((m.ffmKg + 1.5) / hm2, 12);
    expect(r.almi).toBeCloseTo((m.almKg + 0.9) / hm2, 12);
    expect(r.fmi).toBeCloseTo(p.fmi, 12);
    expect(r.whtr).toBeCloseTo((p.waistCm + 2) / p.heightCm, 12);
  });
});
