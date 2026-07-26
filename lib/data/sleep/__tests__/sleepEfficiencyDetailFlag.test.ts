import { afterEach, describe, expect, it } from "@jest/globals";

import {
  isSleepEfficiencyDetailV1Enabled,
  setSleepEfficiencyDetailV1EnabledForTests,
  SLEEP_EFFICIENCY_DETAIL_V1_ENV_KEY,
} from "@/lib/data/sleep/sleepEfficiencyDetailFlag";
import {
  DEEP_SLEEP_DETAIL_V1_ENV_KEY,
  isDeepSleepDetailV1Enabled,
  setDeepSleepDetailV1EnabledForTests,
} from "@/lib/data/sleep/deepSleepDetailFlag";

describe("sleepEfficiencyDetailFlag", () => {
  const prev = process.env[SLEEP_EFFICIENCY_DETAIL_V1_ENV_KEY];
  const prevDeep = process.env[DEEP_SLEEP_DETAIL_V1_ENV_KEY];

  afterEach(() => {
    setSleepEfficiencyDetailV1EnabledForTests(null);
    setDeepSleepDetailV1EnabledForTests(null);
    if (prev === undefined) delete process.env[SLEEP_EFFICIENCY_DETAIL_V1_ENV_KEY];
    else process.env[SLEEP_EFFICIENCY_DETAIL_V1_ENV_KEY] = prev;
    if (prevDeep === undefined) delete process.env[DEEP_SLEEP_DETAIL_V1_ENV_KEY];
    else process.env[DEEP_SLEEP_DETAIL_V1_ENV_KEY] = prevDeep;
  });

  it("defaults enabled and treats 0 as disabled", () => {
    delete process.env[SLEEP_EFFICIENCY_DETAIL_V1_ENV_KEY];
    expect(isSleepEfficiencyDetailV1Enabled()).toBe(true);
    process.env[SLEEP_EFFICIENCY_DETAIL_V1_ENV_KEY] = "0";
    expect(isSleepEfficiencyDetailV1Enabled()).toBe(false);
    process.env[SLEEP_EFFICIENCY_DETAIL_V1_ENV_KEY] = "1";
    expect(isSleepEfficiencyDetailV1Enabled()).toBe(true);
    process.env[SLEEP_EFFICIENCY_DETAIL_V1_ENV_KEY] = "weird";
    expect(isSleepEfficiencyDetailV1Enabled()).toBe(true);
  });

  it("is independent of Deep flag", () => {
    process.env[SLEEP_EFFICIENCY_DETAIL_V1_ENV_KEY] = "0";
    setDeepSleepDetailV1EnabledForTests(true);
    expect(isSleepEfficiencyDetailV1Enabled()).toBe(false);
    expect(isDeepSleepDetailV1Enabled()).toBe(true);
  });
});
