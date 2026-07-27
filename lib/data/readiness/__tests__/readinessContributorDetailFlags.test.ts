import { afterEach, describe, expect, it } from "@jest/globals";

import {
  HRV_BALANCE_DETAIL_V1_ENV_KEY,
  isHrvBalanceDetailV1Enabled,
  setHrvBalanceDetailV1EnabledForTests,
} from "@/lib/data/readiness/hrvBalanceDetailFlag";
import {
  BODY_TEMPERATURE_DETAIL_V1_ENV_KEY,
  isBodyTemperatureDetailV1Enabled,
  setBodyTemperatureDetailV1EnabledForTests,
} from "@/lib/data/readiness/bodyTemperatureDetailFlag";
import {
  RECOVERY_INDEX_DETAIL_V1_ENV_KEY,
  isRecoveryIndexDetailV1Enabled,
  setRecoveryIndexDetailV1EnabledForTests,
} from "@/lib/data/readiness/recoveryIndexDetailFlag";
import {
  SLEEP_BALANCE_DETAIL_V1_ENV_KEY,
  isSleepBalanceDetailV1Enabled,
  setSleepBalanceDetailV1EnabledForTests,
} from "@/lib/data/readiness/sleepBalanceDetailFlag";
import {
  isRestingHeartRateDetailV1Enabled,
  setRestingHeartRateDetailV1EnabledForTests,
} from "@/lib/data/readiness/restingHeartRateDetailFlag";

describe("readiness contributor detail flags", () => {
  const prev = {
    hrv: process.env[HRV_BALANCE_DETAIL_V1_ENV_KEY],
    body: process.env[BODY_TEMPERATURE_DETAIL_V1_ENV_KEY],
    recovery: process.env[RECOVERY_INDEX_DETAIL_V1_ENV_KEY],
    sleep: process.env[SLEEP_BALANCE_DETAIL_V1_ENV_KEY],
  };

  afterEach(() => {
    setHrvBalanceDetailV1EnabledForTests(null);
    setBodyTemperatureDetailV1EnabledForTests(null);
    setRecoveryIndexDetailV1EnabledForTests(null);
    setSleepBalanceDetailV1EnabledForTests(null);
    setRestingHeartRateDetailV1EnabledForTests(null);
    for (const [key, value] of [
      [HRV_BALANCE_DETAIL_V1_ENV_KEY, prev.hrv],
      [BODY_TEMPERATURE_DETAIL_V1_ENV_KEY, prev.body],
      [RECOVERY_INDEX_DETAIL_V1_ENV_KEY, prev.recovery],
      [SLEEP_BALANCE_DETAIL_V1_ENV_KEY, prev.sleep],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it.each([
    {
      name: "hrv",
      key: HRV_BALANCE_DETAIL_V1_ENV_KEY,
      isEnabled: isHrvBalanceDetailV1Enabled,
      setForTests: setHrvBalanceDetailV1EnabledForTests,
    },
    {
      name: "body",
      key: BODY_TEMPERATURE_DETAIL_V1_ENV_KEY,
      isEnabled: isBodyTemperatureDetailV1Enabled,
      setForTests: setBodyTemperatureDetailV1EnabledForTests,
    },
    {
      name: "recovery",
      key: RECOVERY_INDEX_DETAIL_V1_ENV_KEY,
      isEnabled: isRecoveryIndexDetailV1Enabled,
      setForTests: setRecoveryIndexDetailV1EnabledForTests,
    },
    {
      name: "sleep",
      key: SLEEP_BALANCE_DETAIL_V1_ENV_KEY,
      isEnabled: isSleepBalanceDetailV1Enabled,
      setForTests: setSleepBalanceDetailV1EnabledForTests,
    },
  ])("$name defaults enabled; 0 disables; 1/weird enables", ({ key, isEnabled }) => {
    delete process.env[key];
    expect(isEnabled()).toBe(true);
    process.env[key] = "0";
    expect(isEnabled()).toBe(false);
    process.env[key] = "1";
    expect(isEnabled()).toBe(true);
    process.env[key] = "weird";
    expect(isEnabled()).toBe(true);
  });

  it("flags are independent of each other and of RHR", () => {
    process.env[HRV_BALANCE_DETAIL_V1_ENV_KEY] = "0";
    setBodyTemperatureDetailV1EnabledForTests(true);
    setRecoveryIndexDetailV1EnabledForTests(true);
    setSleepBalanceDetailV1EnabledForTests(true);
    setRestingHeartRateDetailV1EnabledForTests(true);
    expect(isHrvBalanceDetailV1Enabled()).toBe(false);
    expect(isBodyTemperatureDetailV1Enabled()).toBe(true);
    expect(isRecoveryIndexDetailV1Enabled()).toBe(true);
    expect(isSleepBalanceDetailV1Enabled()).toBe(true);
    expect(isRestingHeartRateDetailV1Enabled()).toBe(true);
  });
});
