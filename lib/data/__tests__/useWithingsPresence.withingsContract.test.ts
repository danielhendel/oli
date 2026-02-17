/**
 * Regression test: Withings presence must query kind "weight" and filter by sourceId "withings".
 * If this test fails, the kind/provenance contract has regressed and "recent Withings data" will be wrong.
 */
import {
  WITHINGS_WEIGHT_KIND,
  WITHINGS_SOURCE_ID,
} from "../withingsPresenceContract";
import type { RawEventListItem } from "@oli/contracts";

describe("useWithingsPresence — Withings kind/sourceId contract", () => {
  it("exports contract constants that match ingestion (kind=weight, sourceId=withings)", () => {
    expect(WITHINGS_WEIGHT_KIND).toBe("weight");
    expect(WITHINGS_SOURCE_ID).toBe("withings");
  });

  it("filtering by sourceId yields only Withings events for hasRecentData/latest", () => {
    const items: RawEventListItem[] = [
      {
        id: "manual-1",
        userId: "u1",
        sourceId: "manual",
        kind: "weight",
        observedAt: "2025-01-15T10:00:00.000Z",
        receivedAt: "2025-01-15T10:01:00.000Z",
        schemaVersion: 1,
      },
      {
        id: "withings-1",
        userId: "u1",
        sourceId: "withings",
        kind: "weight",
        observedAt: "2025-01-14T08:00:00.000Z",
        receivedAt: "2025-01-15T09:00:00.000Z",
        schemaVersion: 1,
      },
      {
        id: "withings-2",
        userId: "u1",
        sourceId: "withings",
        kind: "weight",
        observedAt: "2025-01-16T07:00:00.000Z",
        receivedAt: "2025-01-16T07:01:00.000Z",
        schemaVersion: 1,
      },
    ];
    const withingsOnly = items.filter((item) => item.sourceId === WITHINGS_SOURCE_ID);
    expect(withingsOnly).toHaveLength(2);
    const latest =
      withingsOnly.length > 0
        ? withingsOnly.reduce((a, b) =>
            a.observedAt > b.observedAt ? a : b,
          ).observedAt
        : null;
    expect(latest).toBe("2025-01-16T07:00:00.000Z");
    expect(withingsOnly.every((i) => i.sourceId === "withings")).toBe(true);
  });

  it("rejects invalid kind (withings.body_measurement would return zero Withings events)", () => {
    // Contract: ingestion writes kind "weight", not "withings.body_measurement".
    // If someone regresses to kinds: ["withings.body_measurement"], API returns [] and hasRecentData is always false.
    expect(WITHINGS_WEIGHT_KIND).not.toBe("withings.body_measurement");
  });
});
