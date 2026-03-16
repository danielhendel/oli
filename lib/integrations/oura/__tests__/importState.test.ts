/**
 * Unit tests for deriveOuraImportState.
 */
import { deriveOuraImportState } from "../importState";

describe("deriveOuraImportState", () => {
  it("returns disconnected when not connected", () => {
    expect(
      deriveOuraImportState({
        connected: false,
        lastSnapshotAt: "2025-03-14T12:00:00.000Z",
        backfillStatus: "completed",
      }),
    ).toBe("disconnected");
  });

  it("returns running when connected and backfillStatus is running", () => {
    expect(
      deriveOuraImportState({
        connected: true,
        lastSnapshotAt: null,
        backfillStatus: "running",
      }),
    ).toBe("running");
  });

  it("returns failed when connected and backfillStatus is failed", () => {
    expect(
      deriveOuraImportState({
        connected: true,
        lastSnapshotAt: null,
        backfillStatus: "failed",
      }),
    ).toBe("failed");
  });

  it("returns ready when connected and lastSnapshotAt is set", () => {
    expect(
      deriveOuraImportState({
        connected: true,
        lastSnapshotAt: "2025-03-14T12:00:00.000Z",
        backfillStatus: "completed",
      }),
    ).toBe("ready");
  });

  it("returns ready when lastSnapshotAt is set even if backfillStatus is failed", () => {
    expect(
      deriveOuraImportState({
        connected: true,
        lastSnapshotAt: "2025-03-14T12:00:00.000Z",
        backfillStatus: "failed",
      }),
    ).toBe("ready");
  });

  it("returns connected_no_data when connected, no snapshot, backfill idle", () => {
    expect(
      deriveOuraImportState({
        connected: true,
        lastSnapshotAt: null,
        backfillStatus: "idle",
      }),
    ).toBe("connected_no_data");
  });

  it("returns connected_no_data when connected, no snapshot, backfill completed", () => {
    expect(
      deriveOuraImportState({
        connected: true,
        lastSnapshotAt: null,
        backfillStatus: "completed",
      }),
    ).toBe("connected_no_data");
  });

  it("returns connected_no_data when connected, no snapshot, backfillStatus undefined", () => {
    expect(
      deriveOuraImportState({
        connected: true,
        lastSnapshotAt: null,
      }),
    ).toBe("connected_no_data");
  });
});
