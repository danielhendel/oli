import { describe, expect, it } from "@jest/globals";
import {
  preferredBodyMetricSource,
  sourceMatchesPreferredBodySource,
  filterToAppleHealthBodyReadSources,
  isAppleHealthBodyReadSourceId,
} from "../sourceFiltering";

describe("body source filtering", () => {
  it("defaults missing body metric source to apple_health", () => {
    expect(preferredBodyMetricSource(undefined, "weight")).toBe("apple_health");
    expect(preferredBodyMetricSource({}, "body_fat_percent")).toBe("apple_health");
  });

  it("accepts both apple_health and healthkit ids for apple_health preference", () => {
    expect(sourceMatchesPreferredBodySource("apple_health", "apple_health")).toBe(true);
    expect(sourceMatchesPreferredBodySource("healthkit", "apple_health")).toBe(true);
    expect(sourceMatchesPreferredBodySource("manual", "apple_health")).toBe(false);
  });

  it("matches non-apple source preferences exactly", () => {
    expect(sourceMatchesPreferredBodySource("manual", "manual")).toBe(true);
    expect(sourceMatchesPreferredBodySource("healthkit", "manual")).toBe(false);
  });

  it("maps stale withings body preference to apple_health", () => {
    expect(preferredBodyMetricSource({ weight: "withings" }, "weight")).toBe("apple_health");
  });

  it("filterToAppleHealthBodyReadSources drops withings and manual", () => {
    const rows = [
      { sourceId: "withings", x: 1 },
      { sourceId: "apple_health", x: 2 },
      { sourceId: "manual", x: 3 },
      { sourceId: "healthkit", x: 4 },
    ];
    expect(filterToAppleHealthBodyReadSources(rows)).toEqual([
      { sourceId: "apple_health", x: 2 },
      { sourceId: "healthkit", x: 4 },
    ]);
  });

  it("isAppleHealthBodyReadSourceId accepts apple_health and healthkit only", () => {
    expect(isAppleHealthBodyReadSourceId("apple_health")).toBe(true);
    expect(isAppleHealthBodyReadSourceId("healthkit")).toBe(true);
    expect(isAppleHealthBodyReadSourceId("withings")).toBe(false);
  });
});
