/**
 * Score-layer recency and era helpers (§4.8 / §6).
 */
import { describe, expect, it } from "@jest/globals";

import { DAY_MS, MAX_SCORE_CONSTRUCT_GAP_MS, MAX_SCORE_INPUT_AGE_MS } from "../constants";
import {
  eraGapMs,
  eraOk,
  measuredAtReason,
  parseMeasuredAtMs,
  sameVerifiedBodyScan,
} from "../recency";

const AS_OF_MS = Date.parse("2026-06-01T00:00:00.000Z");

describe("measuredAtReason", () => {
  it("classifies asOf-relative ages at boundary ms", () => {
    expect(measuredAtReason(AS_OF_MS + 1, AS_OF_MS)).toBe("future_evidence");
    expect(measuredAtReason(AS_OF_MS, AS_OF_MS)).toBeNull();
    expect(measuredAtReason(AS_OF_MS - 1, AS_OF_MS)).toBeNull();
    expect(measuredAtReason(AS_OF_MS - 179 * DAY_MS, AS_OF_MS)).toBeNull();
    expect(measuredAtReason(AS_OF_MS - 180 * DAY_MS, AS_OF_MS)).toBeNull();
    expect(measuredAtReason(AS_OF_MS - 180 * DAY_MS - 1, AS_OF_MS)).toBe(
      "evidence_too_old",
    );
  });

  it("treats missing/malformed/non-finite measuredAt as invalid_provenance", () => {
    expect(measuredAtReason(null, AS_OF_MS)).toBe("invalid_provenance");
    expect(measuredAtReason(Number.NaN, AS_OF_MS)).toBe("invalid_provenance");
    expect(measuredAtReason(parseMeasuredAtMs(""), AS_OF_MS)).toBe("invalid_provenance");
    expect(measuredAtReason(parseMeasuredAtMs("not-a-date"), AS_OF_MS)).toBe(
      "invalid_provenance",
    );
  });

  it("rejects future evidence before stale classification", () => {
    const future = AS_OF_MS + DAY_MS;
    const stale = AS_OF_MS - MAX_SCORE_INPUT_AGE_MS - DAY_MS;
    expect(measuredAtReason(future, AS_OF_MS)).toBe("future_evidence");
    expect(measuredAtReason(stale, AS_OF_MS)).toBe("evidence_too_old");
  });
});

describe("era gap", () => {
  it("allows gap 89d, withholds at 90d+1ms across distinct scans", () => {
    const t0 = AS_OF_MS - 30 * DAY_MS;
    const t89 = t0 - 89 * DAY_MS;
    const t90 = t0 - 90 * DAY_MS;
    const t91 = t0 - 90 * DAY_MS - 1;
    expect(
      eraGapMs([
        { measuredAtMs: t0, scanRef: "a" },
        { measuredAtMs: t89, scanRef: "b" },
      ]),
    ).toBe(89 * DAY_MS);
    expect(
      eraOk([
        { measuredAtMs: t0, scanRef: "a" },
        { measuredAtMs: t89, scanRef: "b" },
      ]),
    ).toBe(true);
    expect(
      eraGapMs([
        { measuredAtMs: t0, scanRef: "a" },
        { measuredAtMs: t90, scanRef: "b" },
      ]),
    ).toBe(MAX_SCORE_CONSTRUCT_GAP_MS);
    expect(
      eraOk([
        { measuredAtMs: t0, scanRef: "a" },
        { measuredAtMs: t90, scanRef: "b" },
      ]),
    ).toBe(true);
    expect(
      eraOk([
        { measuredAtMs: t0, scanRef: "a" },
        { measuredAtMs: t91, scanRef: "b" },
      ]),
    ).toBe(false);
  });

  it("zeros gap for same verified Body Scan scanRef", () => {
    expect(
      sameVerifiedBodyScan(
        { measuredAtMs: 1, scanRef: "scan_1" },
        { measuredAtMs: 2, scanRef: "scan_1" },
      ),
    ).toBe(true);
    expect(
      eraGapMs([
        { measuredAtMs: AS_OF_MS, scanRef: "scan_1" },
        { measuredAtMs: AS_OF_MS - 200 * DAY_MS, scanRef: "scan_1" },
      ]),
    ).toBe(0);
  });
});
