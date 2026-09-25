import { afterEach, describe, expect, it } from "@jest/globals";

import {
  BODY_SCANS_V1_ENV_KEY,
  isBodyScansV1Enabled,
  setBodyScansV1EnabledForTests,
} from "../bodyScansFlag";

describe("bodyScans flag", () => {
  afterEach(() => {
    setBodyScansV1EnabledForTests(null);
  });

  it("is enabled in development when unset", () => {
    expect(isBodyScansV1Enabled({ NODE_ENV: "development" })).toBe(true);
  });

  it("is disabled outside development when unset", () => {
    expect(isBodyScansV1Enabled({ NODE_ENV: "production" })).toBe(false);
    expect(isBodyScansV1Enabled({})).toBe(false);
  });

  it("honors explicit env overrides", () => {
    expect(isBodyScansV1Enabled({ [BODY_SCANS_V1_ENV_KEY]: "1", NODE_ENV: "production" })).toBe(true);
    expect(isBodyScansV1Enabled({ [BODY_SCANS_V1_ENV_KEY]: "0", NODE_ENV: "development" })).toBe(false);
  });

  it("honors the test override over env", () => {
    setBodyScansV1EnabledForTests(true);
    expect(isBodyScansV1Enabled({ [BODY_SCANS_V1_ENV_KEY]: "0" })).toBe(true);
    setBodyScansV1EnabledForTests(false);
    expect(isBodyScansV1Enabled({ [BODY_SCANS_V1_ENV_KEY]: "1" })).toBe(false);
  });
});
