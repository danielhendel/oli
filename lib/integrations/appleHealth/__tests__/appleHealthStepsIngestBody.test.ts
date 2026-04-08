import { describe, it, expect } from "@jest/globals";
import { buildAppleHealthStepsIngestBody } from "../appleHealthStepsIngestBody";

describe("buildAppleHealthStepsIngestBody", () => {
  it("matches anchored sync envelope shape", () => {
    const body = buildAppleHealthStepsIngestBody({
      start: "2026-04-07T04:00:00.000Z",
      end: "2026-04-08T03:59:59.999Z",
      day: "2026-04-07",
      timezone: "America/New_York",
      steps: 8421,
    });
    expect(body.provider).toBe("apple_health");
    expect(body.sourceId).toBe("apple_health");
    expect(body.kind).toBe("steps");
    expect(body.observedAt).toBe("2026-04-07T04:00:00.000Z");
    expect(body.timeZone).toBe("America/New_York");
    expect(body.payload.steps).toBe(8421);
    expect(body.payload.sync).toEqual({ mode: "range", anchorVersion: 1, anchorUsed: false });
  });
});
