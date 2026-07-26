import { afterEach, describe, expect, it } from "@jest/globals";

import {
  DEEP_SLEEP_DETAIL_V1_ENV_KEY,
  isDeepSleepDetailV1Enabled,
  setDeepSleepDetailV1EnabledForTests,
} from "@/lib/data/sleep/deepSleepDetailFlag";
import {
  isRemSleepDetailV1Enabled,
  REM_SLEEP_DETAIL_V1_ENV_KEY,
  setRemSleepDetailV1EnabledForTests,
} from "@/lib/data/sleep/remSleepDetailFlag";

describe("deepSleepDetailFlag", () => {
  const prev = process.env[DEEP_SLEEP_DETAIL_V1_ENV_KEY];

  afterEach(() => {
    setDeepSleepDetailV1EnabledForTests(null);
    if (prev === undefined) delete process.env[DEEP_SLEEP_DETAIL_V1_ENV_KEY];
    else process.env[DEEP_SLEEP_DETAIL_V1_ENV_KEY] = prev;
  });

  it("defaults enabled and treats 0 as disabled", () => {
    delete process.env[DEEP_SLEEP_DETAIL_V1_ENV_KEY];
    expect(isDeepSleepDetailV1Enabled()).toBe(true);
    process.env[DEEP_SLEEP_DETAIL_V1_ENV_KEY] = "0";
    expect(isDeepSleepDetailV1Enabled()).toBe(false);
    process.env[DEEP_SLEEP_DETAIL_V1_ENV_KEY] = "1";
    expect(isDeepSleepDetailV1Enabled()).toBe(true);
    process.env[DEEP_SLEEP_DETAIL_V1_ENV_KEY] = "weird";
    expect(isDeepSleepDetailV1Enabled()).toBe(true);
  });
});

describe("remSleepDetailFlag", () => {
  const prev = process.env[REM_SLEEP_DETAIL_V1_ENV_KEY];

  afterEach(() => {
    setRemSleepDetailV1EnabledForTests(null);
    if (prev === undefined) delete process.env[REM_SLEEP_DETAIL_V1_ENV_KEY];
    else process.env[REM_SLEEP_DETAIL_V1_ENV_KEY] = prev;
  });

  it("defaults enabled and treats 0 as disabled independently of Deep", () => {
    delete process.env[REM_SLEEP_DETAIL_V1_ENV_KEY];
    expect(isRemSleepDetailV1Enabled()).toBe(true);
    process.env[REM_SLEEP_DETAIL_V1_ENV_KEY] = "0";
    expect(isRemSleepDetailV1Enabled()).toBe(false);
    setDeepSleepDetailV1EnabledForTests(true);
    expect(isRemSleepDetailV1Enabled()).toBe(false);
    process.env[REM_SLEEP_DETAIL_V1_ENV_KEY] = "1";
    expect(isRemSleepDetailV1Enabled()).toBe(true);
  });
});
