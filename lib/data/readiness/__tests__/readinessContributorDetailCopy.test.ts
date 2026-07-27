import { describe, expect, it } from "@jest/globals";

import {
  HRV_BALANCE_DETAIL_EXPLAINER_COPY,
  BODY_TEMPERATURE_DETAIL_EXPLAINER_COPY,
  RECOVERY_INDEX_DETAIL_EXPLAINER_COPY,
  SLEEP_BALANCE_DETAIL_EXPLAINER_COPY,
  readinessContributorDetailCopyFor,
} from "@/lib/data/readiness/readinessContributorDetailCopy";
import { readinessContributorDetailConfigFor } from "@/lib/data/readiness/readinessContributorDetailConfig";
import { READINESS_CONTRIBUTOR_DETAIL_METRICS } from "@/lib/data/readiness/readinessContributorDetailTypes";

describe("readinessContributorDetailCopy", () => {
  it("covers all four metrics exhaustively", () => {
    for (const metric of READINESS_CONTRIBUTOR_DETAIL_METRICS) {
      const copy = readinessContributorDetailCopyFor(metric);
      expect(copy.whatItMeasures.heading).toBe("What it measures");
      expect(copy.howToUnderstand.heading).toBe("How to understand it");
      expect(copy.whatCanHelp.heading).toBe("What can help");
      expect(copy.dataAccuracy.heading).toBe("Data & accuracy");
      expect(copy.dataAccuracy.body).toMatch(/Oura/i);
    }
  });

  it("HRV Balance never displays as ms and rejects population target", () => {
    const blob = JSON.stringify(HRV_BALANCE_DETAIL_EXPLAINER_COPY);
    expect(blob).not.toMatch(/\bms\b/i);
    expect(blob).not.toMatch(/population/i);
    expect(blob).toMatch(/not a raw HRV measurement in milliseconds/);
    expect(blob).toMatch(/Oura/);
  });

  it("Body Temperature never implies degrees, deviation, or fever", () => {
    const blob = JSON.stringify(BODY_TEMPERATURE_DETAIL_EXPLAINER_COPY);
    expect(blob).not.toMatch(/°F|°C|\bFahrenheit\b|\bCelsius\b/i);
    expect(blob).not.toMatch(/fever/i);
    expect(blob).toMatch(/not currently display or reconstruct/);
  });

  it("Recovery Index stays provider-derived without formula reconstruction", () => {
    const blob = JSON.stringify(RECOVERY_INDEX_DETAIL_EXPLAINER_COPY);
    expect(blob).toMatch(/provider/i);
    expect(blob).toMatch(/does not reproduce the proprietary calculation/);
    expect(blob).not.toMatch(/formula|algorithm|percentage recovered/i);
  });

  it("Sleep Balance is distinct from Duration and has no 7–9 hour claim", () => {
    const blob = JSON.stringify(SLEEP_BALANCE_DETAIL_EXPLAINER_COPY);
    expect(blob).toMatch(/distinct from the Sleep Duration metric/);
    expect(blob).not.toMatch(/7–9|7-9|seven to nine/i);
  });

  it("config titles and route params match product contract", () => {
    expect(readinessContributorDetailConfigFor("hrv_balance").title).toBe("HRV Balance");
    expect(readinessContributorDetailConfigFor("body_temperature").routeParam).toBe(
      "body-temperature",
    );
    expect(readinessContributorDetailConfigFor("recovery_index").supportingLabel).toBe(
      "Oura contributor score",
    );
    expect(readinessContributorDetailConfigFor("sleep_balance").contributorKey).toBe(
      "sleep_balance",
    );
  });
});
