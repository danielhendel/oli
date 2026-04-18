import { shouldIngestAppleHealthStepsForDay } from "../appleHealthStepsIngestGuard";

describe("shouldIngestAppleHealthStepsForDay", () => {
  it("allows first ingest when there is no prior value", () => {
    expect(
      shouldIngestAppleHealthStepsForDay({
        healthSteps: 133,
        lastIngestedSteps: null,
      }),
    ).toBe(true);
  });

  it("allows higher cumulative than last successful ingest", () => {
    expect(
      shouldIngestAppleHealthStepsForDay({
        healthSteps: 2732,
        lastIngestedSteps: 133,
      }),
    ).toBe(true);
  });

  it("blocks strict regression when last ingest is known and new count is positive", () => {
    expect(
      shouldIngestAppleHealthStepsForDay({
        healthSteps: 133,
        lastIngestedSteps: 2732,
      }),
    ).toBe(false);
  });

  it("always ingests hkEmpty (steps 0) so pipeline can record missing aggregate", () => {
    expect(
      shouldIngestAppleHealthStepsForDay({
        healthSteps: 0,
        hkEmpty: true,
        lastIngestedSteps: 9000,
      }),
    ).toBe(true);
  });

  it("allows explicit zero when not hkEmpty (true rest day)", () => {
    expect(
      shouldIngestAppleHealthStepsForDay({
        healthSteps: 0,
        hkEmpty: false,
        lastIngestedSteps: 5000,
      }),
    ).toBe(true);
  });
});
