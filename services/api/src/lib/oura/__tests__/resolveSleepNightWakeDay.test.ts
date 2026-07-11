import {
  isValidDayKey,
  normalizeProviderDay,
  repairWakeDayFromAnchorSkew,
  resolveSleepNightWakeDay,
} from "../resolveSleepNightWakeDay";

describe("resolveSleepNightWakeDay — truth table", () => {
  it("Tokyo overnight: provider wake morning after UTC end → provider", () => {
    // Wake 06:30 JST 2026-07-10 = 2026-07-09T21:30:00Z
    expect(
      resolveSleepNightWakeDay({ utcEndDay: "2026-07-09", providerDay: "2026-07-10" }),
    ).toBe("2026-07-10");
  });

  it("Los Angeles overnight: provider day equals UTC end → provider", () => {
    // Wake 06:30 PDT 2026-07-10 = 2026-07-10T13:30:00Z
    expect(
      resolveSleepNightWakeDay({ utcEndDay: "2026-07-10", providerDay: "2026-07-10" }),
    ).toBe("2026-07-10");
  });

  it("London DST spring: provider equals UTC end across transition morning", () => {
    // UK clocks forward 2026-03-29; wake ~07:00 BST = 06:00 UTC same calendar day
    expect(
      resolveSleepNightWakeDay({ utcEndDay: "2026-03-29", providerDay: "2026-03-29" }),
    ).toBe("2026-03-29");
  });

  it("London DST fall: provider equals UTC end", () => {
    // UK clocks back 2026-10-25; wake ~07:00 GMT = 07:00 UTC
    expect(
      resolveSleepNightWakeDay({ utcEndDay: "2026-10-25", providerDay: "2026-10-25" }),
    ).toBe("2026-10-25");
  });

  it("Sleep crosses midnight with matching provider/UTC → that day", () => {
    expect(
      resolveSleepNightWakeDay({ utcEndDay: "2026-04-19", providerDay: "2026-04-19" }),
    ).toBe("2026-04-19");
  });

  it("Provider day earlier than UTC end (bed-day rollup) → UTC end", () => {
    expect(
      resolveSleepNightWakeDay({ utcEndDay: "2026-07-10", providerDay: "2026-07-09" }),
    ).toBe("2026-07-10");
  });

  it("Provider day later than UTC end → provider", () => {
    expect(
      resolveSleepNightWakeDay({ utcEndDay: "2026-07-09", providerDay: "2026-07-10" }),
    ).toBe("2026-07-10");
  });

  it("Missing provider day → UTC end", () => {
    expect(resolveSleepNightWakeDay({ utcEndDay: "2026-07-10", providerDay: null })).toBe(
      "2026-07-10",
    );
  });

  it("Invalid provider day → UTC end", () => {
    expect(normalizeProviderDay("not-a-day")).toBeNull();
    expect(
      resolveSleepNightWakeDay({
        utcEndDay: "2026-07-10",
        providerDay: normalizeProviderDay("2026/07/10"),
      }),
    ).toBe("2026-07-10");
  });

  it("Both missing → null", () => {
    expect(resolveSleepNightWakeDay({ utcEndDay: null, providerDay: null })).toBeNull();
  });

  it("rejects non YYYY-MM-DD utcEndDay", () => {
    expect(isValidDayKey("2026-7-10")).toBe(false);
    expect(resolveSleepNightWakeDay({ utcEndDay: "2026-7-10", providerDay: "2026-07-10" })).toBe(
      "2026-07-10",
    );
  });
});

describe("repairWakeDayFromAnchorSkew", () => {
  it("upgrades wake when anchor after UTC end", () => {
    expect(
      repairWakeDayFromAnchorSkew({
        wakeDay: "2026-07-09",
        anchorDay: "2026-07-10",
        utcEndDay: "2026-07-09",
      }),
    ).toBe("2026-07-10");
  });

  it("does not move wake earlier when anchor is before UTC end", () => {
    expect(
      repairWakeDayFromAnchorSkew({
        wakeDay: "2026-07-10",
        anchorDay: "2026-07-09",
        utcEndDay: "2026-07-10",
      }),
    ).toBe("2026-07-10");
  });

  it("ignores invalid anchor", () => {
    expect(
      repairWakeDayFromAnchorSkew({
        wakeDay: "2026-07-09",
        anchorDay: "bogus",
        utcEndDay: "2026-07-09",
      }),
    ).toBe("2026-07-09");
  });
});
