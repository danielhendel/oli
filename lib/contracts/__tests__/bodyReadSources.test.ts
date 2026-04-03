import { describe, expect, it } from "@jest/globals";
import { isAppleHealthBodyReadSourceId } from "../bodyReadSources";

describe("bodyReadSources", () => {
  it("isAppleHealthBodyReadSourceId", () => {
    expect(isAppleHealthBodyReadSourceId("apple_health")).toBe(true);
    expect(isAppleHealthBodyReadSourceId("healthkit")).toBe(true);
    expect(isAppleHealthBodyReadSourceId("withings")).toBe(false);
    expect(isAppleHealthBodyReadSourceId("manual")).toBe(false);
  });
});
