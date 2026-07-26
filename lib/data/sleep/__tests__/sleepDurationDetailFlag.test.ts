import { describe, expect, it, afterEach } from "@jest/globals";

import {
  isSleepDurationDetailV1Enabled,
  setSleepDurationDetailV1EnabledForTests,
  SLEEP_DURATION_DETAIL_V1_ENV_KEY,
} from "@/lib/data/sleep/sleepDurationDetailFlag";

describe("sleepDurationDetailFlag", () => {
  const prev = process.env[SLEEP_DURATION_DETAIL_V1_ENV_KEY];

  afterEach(() => {
    setSleepDurationDetailV1EnabledForTests(null);
    if (prev === undefined) delete process.env[SLEEP_DURATION_DETAIL_V1_ENV_KEY];
    else process.env[SLEEP_DURATION_DETAIL_V1_ENV_KEY] = prev;
  });

  it("defaults enabled and treats 0 as disabled", () => {
    delete process.env[SLEEP_DURATION_DETAIL_V1_ENV_KEY];
    expect(isSleepDurationDetailV1Enabled()).toBe(true);
    process.env[SLEEP_DURATION_DETAIL_V1_ENV_KEY] = "0";
    expect(isSleepDurationDetailV1Enabled()).toBe(false);
    process.env[SLEEP_DURATION_DETAIL_V1_ENV_KEY] = "1";
    expect(isSleepDurationDetailV1Enabled()).toBe(true);
    process.env[SLEEP_DURATION_DETAIL_V1_ENV_KEY] = "weird";
    expect(isSleepDurationDetailV1Enabled()).toBe(true);
  });

  it("honors test override", () => {
    setSleepDurationDetailV1EnabledForTests(false);
    expect(isSleepDurationDetailV1Enabled()).toBe(false);
    setSleepDurationDetailV1EnabledForTests(true);
    expect(isSleepDurationDetailV1Enabled()).toBe(true);
  });
});
