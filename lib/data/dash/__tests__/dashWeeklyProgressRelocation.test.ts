import {
  DASH_WEEKLY_PROGRESS_RELOCATION_ENV_KEY,
  DASH_WEEKLY_PROGRESS_RELOCATION_FLAG_ID,
  WEEKLY_FITNESS_CONSUMER_TITLE,
  WEEKLY_PROGRESS_CONSUMER_TITLE,
  WEEKLY_PROGRESS_SUPPORTING_COPY,
  isDashWeeklyProgressRelocationEnabled,
  setDashWeeklyProgressRelocationEnabledForTests,
} from "../dashWeeklyProgressRelocation";

describe("dashWeeklyProgressRelocation flag", () => {
  const prevEnv = process.env[DASH_WEEKLY_PROGRESS_RELOCATION_ENV_KEY];

  afterEach(() => {
    setDashWeeklyProgressRelocationEnabledForTests(null);
    if (prevEnv === undefined) {
      delete process.env[DASH_WEEKLY_PROGRESS_RELOCATION_ENV_KEY];
    } else {
      process.env[DASH_WEEKLY_PROGRESS_RELOCATION_ENV_KEY] = prevEnv;
    }
  });

  it("exposes the conceptual product flag id", () => {
    expect(DASH_WEEKLY_PROGRESS_RELOCATION_FLAG_ID).toBe("dashWeeklyProgressRelocation");
  });

  it("defaults to enabled (Program placement)", () => {
    delete process.env[DASH_WEEKLY_PROGRESS_RELOCATION_ENV_KEY];
    expect(isDashWeeklyProgressRelocationEnabled()).toBe(true);
  });

  it("disables when env override is 0 (Dash rollback)", () => {
    process.env[DASH_WEEKLY_PROGRESS_RELOCATION_ENV_KEY] = "0";
    expect(isDashWeeklyProgressRelocationEnabled()).toBe(false);
  });

  it("enables when env override is 1", () => {
    process.env[DASH_WEEKLY_PROGRESS_RELOCATION_ENV_KEY] = "1";
    expect(isDashWeeklyProgressRelocationEnabled()).toBe(true);
  });

  it("treats unexpected env values as enabled (same as default)", () => {
    process.env[DASH_WEEKLY_PROGRESS_RELOCATION_ENV_KEY] = "false";
    expect(isDashWeeklyProgressRelocationEnabled()).toBe(true);
    process.env[DASH_WEEKLY_PROGRESS_RELOCATION_ENV_KEY] = "2";
    expect(isDashWeeklyProgressRelocationEnabled()).toBe(true);
    process.env[DASH_WEEKLY_PROGRESS_RELOCATION_ENV_KEY] = "";
    expect(isDashWeeklyProgressRelocationEnabled()).toBe(true);
  });

  it("test override wins over env", () => {
    process.env[DASH_WEEKLY_PROGRESS_RELOCATION_ENV_KEY] = "0";
    setDashWeeklyProgressRelocationEnabledForTests(true);
    expect(isDashWeeklyProgressRelocationEnabled()).toBe(true);
    setDashWeeklyProgressRelocationEnabledForTests(false);
    expect(isDashWeeklyProgressRelocationEnabled()).toBe(false);
  });

  it("keeps consumer copy free of adherence/health-classification claims", () => {
    const surfaces = [
      WEEKLY_PROGRESS_CONSUMER_TITLE,
      WEEKLY_PROGRESS_SUPPORTING_COPY,
      WEEKLY_FITNESS_CONSUMER_TITLE,
    ].join(" ");
    expect(surfaces).not.toMatch(/adherence/i);
    expect(surfaces).not.toMatch(/active program completion/i);
    expect(surfaces).not.toMatch(/health score/i);
    expect(surfaces).not.toMatch(/fitness level/i);
    expect(surfaces).not.toMatch(/medical/i);
    expect(WEEKLY_PROGRESS_CONSUMER_TITLE).toBe("Weekly Progress");
    expect(WEEKLY_PROGRESS_SUPPORTING_COPY).toContain("fitness targets");
  });
});
