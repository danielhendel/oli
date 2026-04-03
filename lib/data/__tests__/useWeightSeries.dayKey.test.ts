import { describe, it, expect } from "@jest/globals";
import { deriveWeightPointDayKey } from "../body/weightDayKey";

describe("useWeightSeries day-key derivation", () => {
  it("uses payload timezone near midnight boundary", () => {
    const day = deriveWeightPointDayKey(
      {
        time: "2026-03-31T00:30:00.000Z",
        timezone: "America/Los_Angeles",
      },
      "2026-03-31T00:30:00.000Z",
      "America/New_York",
    );
    expect(day).toBe("2026-03-30");
  });

  it("aligns with payload timezone when device timezone differs", () => {
    const payloadTime = "2026-03-31T23:30:00.000Z";
    const fromPayloadZone = deriveWeightPointDayKey(
      { time: payloadTime, timezone: "Asia/Tokyo" },
      payloadTime,
      "America/Los_Angeles",
    );
    const fromObservedDeviceZone = deriveWeightPointDayKey(
      undefined,
      payloadTime,
      "America/Los_Angeles",
    );
    expect(fromPayloadZone).toBe("2026-04-01");
    expect(fromObservedDeviceZone).toBe("2026-03-31");
  });
});

