import { describe, expect, it } from "@jest/globals";

import { SLEEP_EFFICIENCY_DETAIL_EXPLAINER_COPY } from "@/lib/data/sleep/sleepEfficiencyExplainerCopy";

describe("sleepEfficiencyExplainerCopy", () => {
  it("owns approved consumer copy without technical or clinical language", () => {
    const copy = SLEEP_EFFICIENCY_DETAIL_EXPLAINER_COPY;
    expect(copy.whatItMeasures.heading).toBe("What it measures");
    expect(copy.whatItMeasures.body).toContain("wearable estimated you were asleep");
    expect(copy.howToUnderstand.body).toContain("85%");
    expect(copy.howToUnderstand.body).toContain("Duration still matters");
    expect(copy.whatCanHelp.body).toContain("wind-down");
    expect(copy.dataAccuracy.body).toContain("wearable");
    expect(copy.dataAccuracy.body).toContain("clinical sleep study");

    const blob = JSON.stringify(copy);
    expect(blob).not.toMatch(
      /SleepNight|timeInBed|canonical|efficiency field|Optimal|Elite|Insomnia|You slept well|healthy|diagnosis/i,
    );
  });
});
