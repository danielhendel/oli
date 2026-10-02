import { describe, expect, it } from "@jest/globals";

import {
  isParseableMeasuredAtIso,
  isValidManualMeasuredAtIso,
  isValidManualWaistMeasuredAtIso,
} from "../bodyMetricManualEntryValidation";

describe("manual waist measuredAt future-date policy", () => {
  const nowMs = Date.parse("2026-10-02T18:00:00.000Z");

  it("accepts historical and exactly-now timestamps", () => {
    expect(isValidManualWaistMeasuredAtIso("2026-03-04T12:00:00.000Z", nowMs)).toBe(true);
    expect(isValidManualWaistMeasuredAtIso("2026-10-02T18:00:00.000Z", nowMs)).toBe(true);
  });

  it("rejects future timestamps with injected clock", () => {
    expect(isValidManualWaistMeasuredAtIso("2026-10-02T18:00:01.000Z", nowMs)).toBe(false);
    expect(isValidManualWaistMeasuredAtIso("2026-10-03T00:00:00.000Z", nowMs)).toBe(false);
  });

  it("rejects invalid ISO", () => {
    expect(isValidManualWaistMeasuredAtIso("", nowMs)).toBe(false);
    expect(isValidManualWaistMeasuredAtIso("not-a-date", nowMs)).toBe(false);
    expect(isParseableMeasuredAtIso("2026-03-04T12:00:00.000Z")).toBe(true);
  });

  it("evaluates timezone offsets against absolute clock", () => {
    // 14:00 EDT = 18:00Z — equal to now → accepted
    expect(isValidManualWaistMeasuredAtIso("2026-10-02T14:00:00.000-04:00", nowMs)).toBe(true);
    // 14:01 EDT = 18:01Z — future → rejected
    expect(isValidManualWaistMeasuredAtIso("2026-10-02T14:01:00.000-04:00", nowMs)).toBe(false);
  });

  it("optional clock on isValidManualMeasuredAtIso rejects future", () => {
    expect(
      isValidManualMeasuredAtIso("2026-10-03T00:00:00.000Z", { nowMs }),
    ).toBe(false);
    expect(isValidManualMeasuredAtIso("2026-03-04T12:00:00.000Z", { nowMs })).toBe(true);
  });
});
