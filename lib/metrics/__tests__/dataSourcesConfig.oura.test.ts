/**
 * Data Sources config — Oura Slice 1.
 * Oura is a source for sleep_duration and hrv only; not for weight or body_fat_percent.
 */
import {
  SLICE_1_SOURCE_IDS,
  SOURCE_DISPLAY_NAMES,
  SOURCE_PROVIDES_METRICS,
  METRIC_ALLOWED_SOURCES,
  getAllowedSourcesForMetric,
  getSourceDisplayName,
} from "../dataSourcesConfig";

describe("dataSourcesConfig Oura Slice 1", () => {
  it("includes oura in SLICE_1_SOURCE_IDS", () => {
    expect(SLICE_1_SOURCE_IDS).toContain("oura");
  });

  it("has display name for Oura", () => {
    expect(SOURCE_DISPLAY_NAMES.oura).toBe("Oura");
    expect(getSourceDisplayName("oura")).toBe("Oura");
  });

  it("Oura provides sleep_duration and hrv only", () => {
    expect(SOURCE_PROVIDES_METRICS.oura).toEqual(["sleep_duration", "hrv"]);
  });

  it("sleep_duration can use oura", () => {
    const allowed = getAllowedSourcesForMetric("sleep_duration");
    expect(allowed).toContain("oura");
  });

  it("hrv can use oura", () => {
    const allowed = getAllowedSourcesForMetric("hrv");
    expect(allowed).toContain("oura");
  });

  it("weight does not allow oura", () => {
    const allowed = getAllowedSourcesForMetric("weight");
    expect(allowed).not.toContain("oura");
  });

  it("body_fat_percent does not allow oura", () => {
    const allowed = getAllowedSourcesForMetric("body_fat_percent");
    expect(allowed).not.toContain("oura");
  });

  it("METRIC_ALLOWED_SOURCES has oura only for sleep_duration and hrv", () => {
    expect(METRIC_ALLOWED_SOURCES.sleep_duration).toContain("oura");
    expect(METRIC_ALLOWED_SOURCES.hrv).toContain("oura");
    expect(METRIC_ALLOWED_SOURCES.weight).not.toContain("oura");
    expect(METRIC_ALLOWED_SOURCES.body_fat_percent).not.toContain("oura");
  });
});
