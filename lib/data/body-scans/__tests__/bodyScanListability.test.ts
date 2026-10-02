/**
 * Secondary hasMore warning audit: queried bodyScans pages should only contain
 * listable records under current write/delete invariants.
 *
 * - Successful delete hard-removes the bodyScans document (no tombstone in query).
 * - Records are created at ingestion completion (not as long-lived uploading stubs).
 * - isListableBodyScan remains a defense-in-depth filter.
 */
import { isListableBodyScanForTest } from "../bodyScanListability";

describe("Body Scan listability / hasMore assumption", () => {
  it("treats active needs_review/verified as listable", () => {
    expect(
      isListableBodyScanForTest({
        status: "needs_review",
        retentionStatus: "active",
      }),
    ).toBe(true);
    expect(
      isListableBodyScanForTest({
        status: "verified",
        retentionStatus: "active",
      }),
    ).toBe(true);
  });

  it("excludes uploading / deleted / retention-deleted from listability", () => {
    expect(
      isListableBodyScanForTest({ status: "uploading", retentionStatus: "active" }),
    ).toBe(false);
    expect(
      isListableBodyScanForTest({ status: "deleted", retentionStatus: "active" }),
    ).toBe(false);
    expect(
      isListableBodyScanForTest({ status: "verified", retentionStatus: "deleted" }),
    ).toBe(false);
  });
});
