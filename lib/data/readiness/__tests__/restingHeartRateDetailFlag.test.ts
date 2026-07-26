import { describe, expect, it, afterEach } from "@jest/globals";

import {
  isRestingHeartRateDetailV1Enabled,
  RESTING_HEART_RATE_DETAIL_V1_ENV_KEY,
  setRestingHeartRateDetailV1EnabledForTests,
} from "@/lib/data/readiness/restingHeartRateDetailFlag";

describe("restingHeartRateDetailFlag", () => {
  const prev = process.env[RESTING_HEART_RATE_DETAIL_V1_ENV_KEY];

  afterEach(() => {
    setRestingHeartRateDetailV1EnabledForTests(null);
    if (prev === undefined) delete process.env[RESTING_HEART_RATE_DETAIL_V1_ENV_KEY];
    else process.env[RESTING_HEART_RATE_DETAIL_V1_ENV_KEY] = prev;
  });

  it("defaults enabled when unset", () => {
    delete process.env[RESTING_HEART_RATE_DETAIL_V1_ENV_KEY];
    expect(isRestingHeartRateDetailV1Enabled()).toBe(true);
  });

  it("disables only on exact 0", () => {
    process.env[RESTING_HEART_RATE_DETAIL_V1_ENV_KEY] = "0";
    expect(isRestingHeartRateDetailV1Enabled()).toBe(false);
  });

  it("enables on 1 and unexpected values", () => {
    process.env[RESTING_HEART_RATE_DETAIL_V1_ENV_KEY] = "1";
    expect(isRestingHeartRateDetailV1Enabled()).toBe(true);
    process.env[RESTING_HEART_RATE_DETAIL_V1_ENV_KEY] = "weird";
    expect(isRestingHeartRateDetailV1Enabled()).toBe(true);
  });

  it("test override wins over env", () => {
    process.env[RESTING_HEART_RATE_DETAIL_V1_ENV_KEY] = "0";
    setRestingHeartRateDetailV1EnabledForTests(true);
    expect(isRestingHeartRateDetailV1Enabled()).toBe(true);
    setRestingHeartRateDetailV1EnabledForTests(false);
    process.env[RESTING_HEART_RATE_DETAIL_V1_ENV_KEY] = "1";
    expect(isRestingHeartRateDetailV1Enabled()).toBe(false);
  });
});
