import {
  DASH_DAILY_MONITOR_FOUNDATION_ENV_KEY,
  DASH_DAILY_MONITOR_FOUNDATION_FLAG_ID,
  DAILY_MONITOR_APP_HEADER_TITLE,
  DAILY_MONITOR_SCREEN_TITLE,
  DAILY_MONITOR_TAB_A11Y_LABEL,
  DAILY_MONITOR_TAB_TITLE,
  TODAY_HOME_SCREEN_TITLE,
  isDashDailyMonitorFoundationEnabled,
  setDashDailyMonitorFoundationEnabledForTests,
} from "../dashDailyMonitorFoundation";

describe("dashDailyMonitorFoundation flag", () => {
  const prevEnv = process.env[DASH_DAILY_MONITOR_FOUNDATION_ENV_KEY];

  afterEach(() => {
    setDashDailyMonitorFoundationEnabledForTests(null);
    if (prevEnv === undefined) {
      delete process.env[DASH_DAILY_MONITOR_FOUNDATION_ENV_KEY];
    } else {
      process.env[DASH_DAILY_MONITOR_FOUNDATION_ENV_KEY] = prevEnv;
    }
  });

  it("exposes the conceptual product flag id and Today home copy", () => {
    expect(DASH_DAILY_MONITOR_FOUNDATION_FLAG_ID).toBe("dashDailyMonitorFoundation");
    expect(DAILY_MONITOR_APP_HEADER_TITLE).toBe("Oli");
    expect(TODAY_HOME_SCREEN_TITLE).toBe("Today");
    expect(DAILY_MONITOR_SCREEN_TITLE).toBe("Today");
    expect(DAILY_MONITOR_TAB_TITLE).toBe("Today");
    expect(DAILY_MONITOR_TAB_A11Y_LABEL).toBe("Today");
  });

  it("defaults to enabled", () => {
    delete process.env[DASH_DAILY_MONITOR_FOUNDATION_ENV_KEY];
    expect(isDashDailyMonitorFoundationEnabled()).toBe(true);
  });

  it("disables when env override is 0", () => {
    process.env[DASH_DAILY_MONITOR_FOUNDATION_ENV_KEY] = "0";
    expect(isDashDailyMonitorFoundationEnabled()).toBe(false);
  });

  it("enables when env override is 1", () => {
    process.env[DASH_DAILY_MONITOR_FOUNDATION_ENV_KEY] = "1";
    expect(isDashDailyMonitorFoundationEnabled()).toBe(true);
  });

  it("treats unexpected env values as enabled", () => {
    process.env[DASH_DAILY_MONITOR_FOUNDATION_ENV_KEY] = "false";
    expect(isDashDailyMonitorFoundationEnabled()).toBe(true);
  });

  it("test override wins over env", () => {
    process.env[DASH_DAILY_MONITOR_FOUNDATION_ENV_KEY] = "0";
    setDashDailyMonitorFoundationEnabledForTests(true);
    expect(isDashDailyMonitorFoundationEnabled()).toBe(true);
  });
});
