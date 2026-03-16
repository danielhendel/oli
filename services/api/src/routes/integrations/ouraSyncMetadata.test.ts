/**
 * Tests for deriveOuraSyncMetadataFields and isLegacyOuraIntegration.
 */

import { deriveOuraSyncMetadataFields, isLegacyOuraIntegration } from "./ouraSyncMetadata";

describe("deriveOuraSyncMetadataFields", () => {
  it("returns setLastSyncAt and setLastSnapshotAt false when snapshotWrittenCount is 0", () => {
    const result = deriveOuraSyncMetadataFields(0);
    expect(result.setLastRefreshAt).toBe(true);
    expect(result.setLastSyncAt).toBe(false);
    expect(result.setLastSnapshotAt).toBe(false);
  });

  it("returns setLastSyncAt and setLastSnapshotAt true when snapshotWrittenCount > 0", () => {
    const result = deriveOuraSyncMetadataFields(2);
    expect(result.setLastRefreshAt).toBe(true);
    expect(result.setLastSyncAt).toBe(true);
    expect(result.setLastSnapshotAt).toBe(true);
  });
});

describe("isLegacyOuraIntegration", () => {
  it("returns false when data is null or undefined", () => {
    expect(isLegacyOuraIntegration(null)).toBe(false);
    expect(isLegacyOuraIntegration(undefined)).toBe(false);
  });

  it("returns false when connected is not true", () => {
    expect(isLegacyOuraIntegration({ connected: false })).toBe(false);
    expect(isLegacyOuraIntegration({ connected: undefined })).toBe(false);
  });

  it("returns false when lastSnapshotAt is set", () => {
    expect(isLegacyOuraIntegration({ connected: true, lastSnapshotAt: "2025-03-14T00:00:00Z" })).toBe(false);
    expect(isLegacyOuraIntegration({ connected: true, lastSnapshotAt: "" })).toBe(false);
  });

  it("returns false when backfillStatus is running, completed, or failed", () => {
    expect(isLegacyOuraIntegration({ connected: true, lastSnapshotAt: null, backfillStatus: "running" })).toBe(false);
    expect(isLegacyOuraIntegration({ connected: true, lastSnapshotAt: null, backfillStatus: "completed" })).toBe(false);
    expect(isLegacyOuraIntegration({ connected: true, lastSnapshotAt: null, backfillStatus: "failed" })).toBe(false);
  });

  it("returns true when connected, no lastSnapshotAt, and backfillStatus null or idle", () => {
    expect(isLegacyOuraIntegration({ connected: true, lastSnapshotAt: null, backfillStatus: null })).toBe(true);
    expect(isLegacyOuraIntegration({ connected: true, backfillStatus: null })).toBe(true);
    expect(isLegacyOuraIntegration({ connected: true, lastSnapshotAt: undefined, backfillStatus: "idle" })).toBe(true);
  });
});
