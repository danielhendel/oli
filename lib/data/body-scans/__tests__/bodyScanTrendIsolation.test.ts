import { describe, expect, it } from "@jest/globals";

import {
  BODY_SCAN_ALLOWED_WRITE_COLLECTIONS,
  BODY_SCAN_FORBIDDEN_WRITE_COLLECTIONS,
  BodyScanIsolationViolationError,
  assertBodyScanWriteTargetAllowed,
  bodyScanMayContributeToContinuousTrend,
  excludeBodyScanSourcedSamples,
  isBodyScanAllowedWriteCollection,
} from "../bodyScanTrendIsolation";

describe("bodyScanTrendIsolation", () => {
  it("allows only the Body Scan collections", () => {
    for (const collection of BODY_SCAN_ALLOWED_WRITE_COLLECTIONS) {
      expect(() => assertBodyScanWriteTargetAllowed(collection)).not.toThrow();
      expect(isBodyScanAllowedWriteCollection(collection)).toBe(true);
    }
  });

  it("rejects every continuous-tracking and derived-truth target", () => {
    for (const collection of BODY_SCAN_FORBIDDEN_WRITE_COLLECTIONS) {
      expect(() => assertBodyScanWriteTargetAllowed(collection)).toThrow(
        BodyScanIsolationViolationError,
      );
    }
  });

  it("fails closed on unknown collections", () => {
    expect(() => assertBodyScanWriteTargetAllowed("somethingNew")).toThrow(
      BodyScanIsolationViolationError,
    );
  });

  it("never lets a scan contribute to a continuous trend", () => {
    expect(bodyScanMayContributeToContinuousTrend()).toBe(false);
  });

  it("filters scan-sourced samples out of continuous series inputs", () => {
    const samples = [
      { source: "apple_health", value: 80 },
      { source: "body_scan_dxa", value: 79 },
      { source: "bodyScanDxa", value: 78 },
      { source: null, value: 77 },
    ];
    expect(excludeBodyScanSourcedSamples(samples).map((s) => s.value)).toEqual([80, 77]);
  });
});
