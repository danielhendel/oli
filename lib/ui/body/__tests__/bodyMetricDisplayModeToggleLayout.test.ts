/**
 * Detail display-mode toggle stays fully inside page content bounds.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import {
  BODY_METRIC_DISPLAY_MODE_TOGGLE_WIDTH,
  BodyMetricDisplayModeToggle,
} from "@/lib/ui/body/BodyMetricDisplayModeToggle";
import { bodySegmentedControlStyles } from "@/lib/ui/body/bodySegmentedControlChrome";

describe("BodyMetricDisplayModeToggle — bounded layout", () => {
  it("reserves a fixed track width wide enough for two equal segments", () => {
    expect(BODY_METRIC_DISPLAY_MODE_TOGGLE_WIDTH).toBeGreaterThanOrEqual(120);
    expect(BODY_METRIC_DISPLAY_MODE_TOGGLE_WIDTH).toBeLessThanOrEqual(160);
    expect(bodySegmentedControlStyles.track.minHeight).toBeGreaterThanOrEqual(44);
  });

  it("exports a shared toggle component used by the detail hero", () => {
    expect(typeof BodyMetricDisplayModeToggle).toBe("function");
  });
});

describe("BodyMetricTrendDetailView — shared hero layout contract", () => {
  const detailSrc = fs.readFileSync(
    path.join(__dirname, "../BodyMetricTrendDetailView.tsx"),
    "utf8",
  );
  const toggleSrc = fs.readFileSync(
    path.join(__dirname, "../BodyMetricDisplayModeToggle.tsx"),
    "utf8",
  );
  const metricSrc = fs.readFileSync(
    path.join(__dirname, "../../../../app/(app)/body/metric/[metric].tsx"),
    "utf8",
  );

  it("keeps the hero row width-bounded with a shrinkable value column", () => {
    expect(detailSrc).toContain('testID="body-metric-trend-hero-row"');
    expect(detailSrc).toContain("flexWrap: \"wrap\"");
    expect(detailSrc).toContain("flexBasis: 0");
    expect(detailSrc).toContain("minWidth: 0");
    expect(detailSrc).toContain("maxWidth: \"100%\"");
    expect(detailSrc).toContain('testID="body-metric-trend-hero-toggle"');
    expect(detailSrc).not.toMatch(/heroToggleCol:[\s\S]*position:\s*["']absolute["']/);
    expect(detailSrc).not.toMatch(/right:\s*-\d/);
  });

  it("does not absolutely position the toggle outside the content container", () => {
    expect(toggleSrc).toContain("BODY_METRIC_DISPLAY_MODE_TOGGLE_WIDTH");
    expect(toggleSrc).toContain("trackBounded");
    expect(toggleSrc).toContain("segmentEqual");
    expect(toggleSrc).not.toMatch(/position:\s*["']absolute["']/);
    expect(toggleSrc).not.toMatch(/right:\s*-\d/);
  });

  it("uses the shared toggle for Weight, Body Fat, and Lean Mass detail", () => {
    expect(metricSrc).toContain("BodyMetricDisplayModeToggle");
    expect(metricSrc).toContain("displayModeToggle");
    expect(metricSrc).toContain('metric === "weight"');
    expect(metricSrc).toContain('metric === "body_fat_percent"');
    expect(metricSrc).toContain('metric === "lean_body_mass"');
    expect(detailSrc).toContain("BodyMetricDisplayModeToggle");
  });

  it("keeps hero value on one line so the toggle is not pushed off-screen", () => {
    expect(detailSrc).toContain("numberOfLines={1}");
    expect(detailSrc).toContain("adjustsFontSizeToFit");
    expect(detailSrc).toContain("marginLeft: \"auto\"");
  });
});
