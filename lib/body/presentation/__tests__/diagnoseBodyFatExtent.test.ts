/**
 * Privacy: Body Fat extent diagnostics never include measurement values or PII.
 */
import {
  buildBodyFatExtentDiagnostic,
  diagnoseBodyFatExtentFromObservedAts,
} from "@/lib/body/presentation/diagnoseBodyFatExtent";

describe("diagnoseBodyFatExtent privacy", () => {
  it("omits Body Fat values, UIDs, emails, tokens, and event IDs from the payload", () => {
    const diag = buildBodyFatExtentDiagnostic({
      layer: "rendered",
      observedAts: [
        "2026-07-28T12:00:00.000Z",
        "2026-09-21T12:00:00.000Z",
      ],
      requestedRange: "All",
      operation: "test",
      pagesLoaded: 3,
    });
    const serialized = JSON.stringify(diag);
    expect(serialized).not.toMatch(/uid|email|token|eventId|sampleId|deviceId/i);
    expect(serialized).not.toMatch(/"weightKg"|"bodyFatPercent"/);
    expect(serialized).not.toMatch(/\b1[4-9]\.\d\b/); // no BF% values
    expect(diag.oldestObservedAt).toBe("2026-07-28T12:00:00.000Z");
    expect(diag.newestObservedAt).toBe("2026-09-21T12:00:00.000Z");
    expect(diag.sampleCountBucket).toBe("1-9");
    expect(diag.pagesLoaded).toBe(3);
  });

  it("emits the correct DEV tag for each layer", () => {
    const spy = jest.spyOn(console, "info").mockImplementation(() => {});
    const prev = (global as { __DEV__?: boolean }).__DEV__;
    (global as { __DEV__?: boolean }).__DEV__ = true;
    try {
      diagnoseBodyFatExtentFromObservedAts("stored", ["2026-01-01T00:00:00.000Z"]);
      diagnoseBodyFatExtentFromObservedAts("trend", ["2026-01-01T00:00:00.000Z"]);
      diagnoseBodyFatExtentFromObservedAts("rendered", ["2026-01-01T00:00:00.000Z"]);
      diagnoseBodyFatExtentFromObservedAts("history_list", ["2026-01-01T00:00:00.000Z"]);
      expect(spy.mock.calls.map((c) => c[0])).toEqual([
        "[BODY_FAT_STORED_EXTENT]",
        "[BODY_FAT_TREND_EXTENT]",
        "[BODY_FAT_RENDERED_EXTENT]",
        "[BODY_FAT_HISTORY_LIST_EXTENT]",
      ]);
      for (const call of spy.mock.calls) {
        expect(JSON.stringify(call[1])).not.toMatch(/uid|email|token/i);
      }
    } finally {
      (global as { __DEV__?: boolean }).__DEV__ = prev;
      spy.mockRestore();
    }
  });
});
