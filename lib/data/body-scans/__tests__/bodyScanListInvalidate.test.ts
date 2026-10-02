import type { BodyScanType } from "@oli/contracts";

import {
  __testing_resetBodyScanListInvalidate,
  bodyScanListInvalidationAffects,
  bodyScanListInvalidationEpoch,
  invalidateBodyScanList,
  resolveBodyScanInvalidationCategories,
  subscribeBodyScanListInvalidation,
  type BodyScanListInvalidation,
} from "../bodyScanListInvalidate";

describe("bodyScanListInvalidate", () => {
  beforeEach(() => {
    __testing_resetBodyScanListInvalidate();
  });

  it("delivers a coalesced event without IDs or PHI fields", async () => {
    const seen: BodyScanListInvalidation[] = [];
    const unsub = subscribeBodyScanListInvalidation((e) => seen.push(e));

    invalidateBodyScanList({ reason: "upload_success", categories: ["inbody"] });
    invalidateBodyScanList({ reason: "confirm_success", categories: ["dxa"] });
    invalidateBodyScanList({ reason: "reprocess_success", categories: "all" });

    await Promise.resolve();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({ reason: "reprocess_success", categories: "all" });
    expect(JSON.stringify(seen[0])).not.toMatch(/scan_|doc_|uid|cursor|http/i);
    unsub();
  });

  it("merges concrete categories when none request all", async () => {
    const seen: BodyScanListInvalidation[] = [];
    subscribeBodyScanListInvalidation((e) => seen.push(e));

    invalidateBodyScanList({ reason: "scan_type_changed", categories: ["other"] });
    invalidateBodyScanList({ reason: "scan_type_changed", categories: ["inbody"] });
    await Promise.resolve();

    expect(seen).toHaveLength(1);
    expect(seen[0].categories).toEqual(["other", "inbody"]);
  });

  it("affects matching categories only", () => {
    const event: BodyScanListInvalidation = {
      reason: "delete_success",
      categories: ["dxa"],
    };
    expect(bodyScanListInvalidationAffects(event, "dxa")).toBe(true);
    expect(bodyScanListInvalidationAffects(event, "inbody")).toBe(false);
    expect(bodyScanListInvalidationAffects({ ...event, categories: "all" }, "inbody")).toBe(true);
    expect(bodyScanListInvalidationAffects(event, "all")).toBe(true);
  });

  it("bumps epoch on flush and resolves all five categories", async () => {
    const before = bodyScanListInvalidationEpoch();
    invalidateBodyScanList({ reason: "manual_refresh", categories: "all" });
    await Promise.resolve();
    expect(bodyScanListInvalidationEpoch()).toBe(before + 1);
    expect(resolveBodyScanInvalidationCategories({ reason: "manual_refresh", categories: "all" })).toEqual(
      ["dxa", "inbody", "evolt", "bod_pod", "other"] satisfies BodyScanType[],
    );
  });

  it("does not loop: subscribe handlers must not re-publish automatically", async () => {
    let count = 0;
    subscribeBodyScanListInvalidation(() => {
      count += 1;
      // Intentionally do not call invalidateBodyScanList here.
    });
    invalidateBodyScanList({ reason: "confirm_success", categories: "all" });
    await Promise.resolve();
    await Promise.resolve();
    expect(count).toBe(1);
  });
});
