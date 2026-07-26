import { describe, expect, it } from "@jest/globals";

import { RESTING_HEART_RATE_DETAIL_EXPLAINER_COPY } from "@/lib/data/readiness/restingHeartRateExplainerCopy";

describe("restingHeartRateExplainerCopy", () => {
  it("uses approved non-clinical consumer wording", () => {
    const copy = RESTING_HEART_RATE_DETAIL_EXPLAINER_COPY;
    expect(copy.whatItMeasures.heading).toBe("What it measures");
    expect(copy.howToUnderstand.heading).toBe("How to understand it");
    expect(copy.whatCanHelp.heading).toBe("What can help");
    expect(copy.dataAccuracy.heading).toBe("Data & accuracy");
    const blob = [
      copy.whatItMeasures.body,
      copy.howToUnderstand.body,
      copy.whatCanHelp.body,
      copy.dataAccuracy.body,
    ].join(" ");
    expect(blob).toMatch(/overnight/i);
    expect(blob).not.toMatch(/bradycardia|tachycardia|Optimal|healthy range|seek care|athletic/i);
    expect(blob).not.toMatch(/lower is better|lowest is best/i);
  });
});
