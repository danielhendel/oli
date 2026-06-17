import {
  isAppleHealthBodyCompositionIngestSuppressionDocId,
  isAppleHealthBodyIngestSuppressionDocId,
  isAppleHealthBodyWeightIngestSuppressionDocId,
  isAppleHealthWorkoutIngestSuppressionDocId,
  isRawEventIngestSuppressionDocId,
} from "../rawEventIngestSuppression";

describe("rawEventIngestSuppression", () => {
  const workoutId =
    "appleHealth:v2:workout:2026-04-18T08:09:59.736-0400_2026-04-18T08:12:42.433-0400_50_com.myzonemoves.app.MYZONE";
  const weightId = "appleHealth:v2:bodyWeight:2026-06-06T14:30:00.000Z_apple_watch";
  const compositionId =
    "appleHealth:v2:bodyComposition:bodyFatPercent:2026-06-06T14:30:00.000Z_healthkit";

  it("classifies workout ids", () => {
    expect(isAppleHealthWorkoutIngestSuppressionDocId(workoutId)).toBe(true);
    expect(isRawEventIngestSuppressionDocId(workoutId)).toBe(true);
  });

  it("classifies body weight ids", () => {
    expect(isAppleHealthBodyWeightIngestSuppressionDocId(weightId)).toBe(true);
    expect(isAppleHealthBodyIngestSuppressionDocId(weightId)).toBe(true);
    expect(isRawEventIngestSuppressionDocId(weightId)).toBe(true);
  });

  it("classifies body composition ids", () => {
    expect(isAppleHealthBodyCompositionIngestSuppressionDocId(compositionId)).toBe(true);
    expect(isAppleHealthBodyIngestSuppressionDocId(compositionId)).toBe(true);
    expect(isRawEventIngestSuppressionDocId(compositionId)).toBe(true);
  });

  it("rejects manual and unrelated ids", () => {
    expect(isRawEventIngestSuppressionDocId("mw_2026-06-06_manual")).toBe(false);
    expect(isRawEventIngestSuppressionDocId("withings_weight_1")).toBe(false);
  });
});
