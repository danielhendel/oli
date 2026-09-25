import { describe, expect, it } from "@jest/globals";
import type { BodyScanStatus } from "@oli/contracts";

import {
  BODY_SCAN_STATUS_COPY,
  bodyScanStatusFromDraftStatus,
  canDeleteBodyScan,
  canReprocessBodyScan,
  canReviewBodyScan,
  isSettledBodyScanStatus,
  isTerminalBodyScanStatus,
  transitionBodyScanStatus,
} from "../bodyScanStatusMachine";

const ALL_STATUSES: BodyScanStatus[] = [
  "uploading",
  "processing",
  "needs_review",
  "verified",
  "failed",
  "deleting",
  "deleted",
];

describe("bodyScanStatusMachine", () => {
  it("allows the documented lifecycle", () => {
    expect(transitionBodyScanStatus("uploading", "processing")).toEqual({ ok: true });
    expect(transitionBodyScanStatus("processing", "needs_review")).toEqual({ ok: true });
    expect(transitionBodyScanStatus("needs_review", "verified")).toEqual({ ok: true });
    expect(transitionBodyScanStatus("failed", "processing")).toEqual({ ok: true });
    expect(transitionBodyScanStatus("verified", "needs_review")).toEqual({ ok: true });
    expect(transitionBodyScanStatus("deleting", "deleted")).toEqual({ ok: true });
  });

  it("rejects skipping review on the way to verified", () => {
    expect(transitionBodyScanStatus("uploading", "verified")).toEqual({
      ok: false,
      reason: "invalid_transition",
    });
    expect(transitionBodyScanStatus("failed", "verified")).toEqual({
      ok: false,
      reason: "invalid_transition",
    });
  });

  it("treats deleted as absorbing and repeat transitions as no-ops", () => {
    for (const status of ALL_STATUSES) {
      expect(transitionBodyScanStatus("deleted", status).ok).toBe(false);
    }
    expect(transitionBodyScanStatus("verified", "verified")).toEqual({
      ok: false,
      reason: "idempotent_noop",
    });
  });

  it("never derives verified from an adapter draft", () => {
    expect(bodyScanStatusFromDraftStatus("extracted")).toBe("needs_review");
    expect(bodyScanStatusFromDraftStatus("partial")).toBe("needs_review");
    expect(bodyScanStatusFromDraftStatus("review_needed")).toBe("needs_review");
    expect(bodyScanStatusFromDraftStatus("unsupported")).toBe("needs_review");
    expect(bodyScanStatusFromDraftStatus("failed")).toBe("failed");
  });

  it("exposes consumer copy for every status", () => {
    for (const status of ALL_STATUSES) {
      expect(BODY_SCAN_STATUS_COPY[status].length).toBeGreaterThan(0);
    }
  });

  it("derives capabilities from status", () => {
    expect(canReviewBodyScan("needs_review")).toBe(true);
    expect(canReviewBodyScan("processing")).toBe(false);
    expect(canReprocessBodyScan("failed")).toBe(true);
    expect(canReprocessBodyScan("uploading")).toBe(false);
    expect(canDeleteBodyScan("verified")).toBe(true);
    expect(canDeleteBodyScan("deleted")).toBe(false);
    expect(isTerminalBodyScanStatus("verified")).toBe(true);
    expect(isSettledBodyScanStatus("needs_review")).toBe(true);
    expect(isSettledBodyScanStatus("processing")).toBe(false);
  });
});
