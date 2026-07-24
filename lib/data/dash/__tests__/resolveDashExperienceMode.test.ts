import { resolveDashExperienceMode } from "../resolveDashExperienceMode";

describe("resolveDashExperienceMode", () => {
  it("enables Daily Monitor only when both flags are on", () => {
    expect(
      resolveDashExperienceMode({
        dailyMonitorEnabled: true,
        weeklyProgressRelocationEnabled: true,
      }),
    ).toBe("daily_monitor");
  });

  it("uses legacy Dash when Daily Monitor is off and relocation is on", () => {
    expect(
      resolveDashExperienceMode({
        dailyMonitorEnabled: false,
        weeklyProgressRelocationEnabled: true,
      }),
    ).toBe("legacy_dash");
  });

  it("uses legacy Dash when both flags are off", () => {
    expect(
      resolveDashExperienceMode({
        dailyMonitorEnabled: false,
        weeklyProgressRelocationEnabled: false,
      }),
    ).toBe("legacy_dash");
  });

  it("falls back to legacy Dash when Daily Monitor is on but relocation is off", () => {
    expect(
      resolveDashExperienceMode({
        dailyMonitorEnabled: true,
        weeklyProgressRelocationEnabled: false,
      }),
    ).toBe("legacy_dash");
  });
});
