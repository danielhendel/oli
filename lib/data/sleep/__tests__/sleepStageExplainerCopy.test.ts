import { describe, expect, it } from "@jest/globals";

import {
  DEEP_SLEEP_DETAIL_EXPLAINER_COPY,
  REM_SLEEP_DETAIL_EXPLAINER_COPY,
  SLEEP_STAGE_UNSUPPORTED_AGE_HOW_TO_UNDERSTAND,
  sleepStageHowToUnderstandBody,
} from "@/lib/data/sleep/sleepStageExplainerCopy";

describe("sleepStageExplainerCopy", () => {
  it("keeps Deep and REM adult-context education free of clinical language", () => {
    expect(DEEP_SLEEP_DETAIL_EXPLAINER_COPY.howToUnderstand.body).toContain("16–20%");
    expect(REM_SLEEP_DETAIL_EXPLAINER_COPY.howToUnderstand.body).toContain("21–30%");
    expect(DEEP_SLEEP_DETAIL_EXPLAINER_COPY.whatCanHelp.body).toContain("total sleep");
    expect(REM_SLEEP_DETAIL_EXPLAINER_COPY.dataAccuracy.body).toContain("clinical sleep study");
    const joined = [
      DEEP_SLEEP_DETAIL_EXPLAINER_COPY.howToUnderstand.body,
      REM_SLEEP_DETAIL_EXPLAINER_COPY.howToUnderstand.body,
      DEEP_SLEEP_DETAIL_EXPLAINER_COPY.whatCanHelp.body,
    ].join(" ");
    expect(joined).not.toMatch(/\boptimal\b|\bdiagnosis\b|\bhealthy range\b|\bclinical normal\b/i);
  });

  it("uses unsupported-age copy when adult context is withheld", () => {
    expect(
      sleepStageHowToUnderstandBody({
        metricId: "deep_sleep",
        adultContextAvailable: false,
      }),
    ).toBe(SLEEP_STAGE_UNSUPPORTED_AGE_HOW_TO_UNDERSTAND);
    expect(
      sleepStageHowToUnderstandBody({
        metricId: "rem_sleep",
        adultContextAvailable: true,
      }),
    ).toContain("21–30%");
  });
});
