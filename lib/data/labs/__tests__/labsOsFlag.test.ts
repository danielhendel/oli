import { describe, expect, it, afterEach } from "@jest/globals";
import { isLabsOsV1Enabled, setLabsOsV1EnabledForTests } from "../labsOsFlag";

describe("isLabsOsV1Enabled", () => {
  afterEach(() => {
    setLabsOsV1EnabledForTests(null);
  });

  it("is enabled when the env var is unset", () => {
    expect(isLabsOsV1Enabled({})).toBe(true);
  });

  it("is enabled when the env var is \"1\"", () => {
    expect(isLabsOsV1Enabled({ EXPO_PUBLIC_LABS_OS_V1: "1" })).toBe(true);
  });

  it("is disabled only when the env var is exactly \"0\"", () => {
    expect(isLabsOsV1Enabled({ EXPO_PUBLIC_LABS_OS_V1: "0" })).toBe(false);
  });

  it("treats any other value as enabled", () => {
    expect(isLabsOsV1Enabled({ EXPO_PUBLIC_LABS_OS_V1: "true" })).toBe(true);
    expect(isLabsOsV1Enabled({ EXPO_PUBLIC_LABS_OS_V1: "bogus" })).toBe(true);
  });

  it("supports a test override regardless of env value", () => {
    setLabsOsV1EnabledForTests(false);
    expect(isLabsOsV1Enabled({ EXPO_PUBLIC_LABS_OS_V1: "1" })).toBe(false);

    setLabsOsV1EnabledForTests(true);
    expect(isLabsOsV1Enabled({ EXPO_PUBLIC_LABS_OS_V1: "0" })).toBe(true);

    setLabsOsV1EnabledForTests(null);
    expect(isLabsOsV1Enabled({ EXPO_PUBLIC_LABS_OS_V1: "0" })).toBe(false);
  });
});
