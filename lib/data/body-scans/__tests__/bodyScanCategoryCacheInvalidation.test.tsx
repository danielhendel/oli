/**
 * Defect 5 — category cache invalidation freshness (no remount required).
 */
import React from "react";
import { act } from "react";
import renderer from "react-test-renderer";

import type { BodyScanListItemDto, BodyScanType } from "@oli/contracts";

import {
  __testing_resetBodyScanListInvalidate,
  invalidateBodyScanList,
} from "../bodyScanListInvalidate";
import { useBodyScanCategorySummaries } from "../useBodyScanCategorySummaries";
import { useBodyScanCategoryHistory } from "../useBodyScanCategoryHistory";

const mockGetBodyScans = jest.fn();
const mockGetIdToken = jest.fn(async () => "token");
const stableAuth = {
  user: { uid: "user_a" },
  initializing: false as const,
  getIdToken: (...args: unknown[]) => mockGetIdToken(...args),
};

jest.mock("@/lib/api/bodyScans", () => ({
  getBodyScans: (...args: unknown[]) => mockGetBodyScans(...args),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => stableAuth,
}));

function item(
  partial: Partial<BodyScanListItemDto> & Pick<BodyScanListItemDto, "id" | "scanType" | "status">,
): BodyScanListItemDto {
  return {
    method: "other",
    performedAt: "2026-09-27T12:00:00.000Z",
    uploadedAt: "2026-09-28T12:00:00.000Z",
    deviceLabel: null,
    statusLabel: "Needs review",
    metricCount: 0,
    canReview: true,
    canRetry: false,
    canDelete: true,
    canViewOriginal: true,
    ...partial,
  };
}

function emptyPage() {
  return { ok: true as const, items: [] as BodyScanListItemDto[], nextCursor: null, hasMore: false };
}

function pageWith(scan: BodyScanListItemDto) {
  return { ok: true as const, items: [scan], nextCursor: null, hasMore: false };
}

let lastSummaries: ReturnType<typeof useBodyScanCategorySummaries> | null = null;
let lastHistory: ReturnType<typeof useBodyScanCategoryHistory> | null = null;

function SummariesHarness() {
  lastSummaries = useBodyScanCategorySummaries({ enabled: true });
  return null;
}

function HistoryHarness({ scanType }: { scanType: BodyScanType }) {
  lastHistory = useBodyScanCategoryHistory({ scanType, enabled: true });
  return null;
}

function CombinedHarness() {
  lastHistory = useBodyScanCategoryHistory({ scanType: "other", enabled: true });
  lastSummaries = useBodyScanCategorySummaries({ enabled: true });
  return null;
}

async function settle(rounds = 8) {
  for (let i = 0; i < rounds; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe("Defect 5 — category cache invalidation", () => {
  beforeEach(() => {
    __testing_resetBodyScanListInvalidate();
    mockGetBodyScans.mockReset();
    mockGetIdToken.mockClear();
    lastSummaries = null;
    lastHistory = null;
  });

  it("refetches empty InBody summary after upload_success without remount", async () => {
    mockGetBodyScans.mockImplementation(
      async (_token: string, opts?: { scanType?: BodyScanType; cacheBust?: string }) => {
        if (opts?.scanType === "inbody" && opts.cacheBust?.includes("invalidate")) {
          return {
            ok: true,
            status: 200,
            requestId: "r1",
            json: pageWith(item({ id: "ib1", scanType: "inbody", status: "needs_review" })),
          };
        }
        return { ok: true, status: 200, requestId: "r0", json: emptyPage() };
      },
    );

    await act(async () => {
      renderer.create(React.createElement(SummariesHarness));
    });
    await settle();
    expect(lastSummaries?.status).toBe("ready");
    expect(lastSummaries?.rows.find((r) => r.category.type === "inbody")!.supportingCopy).toBe(
      "No scans yet",
    );

    await act(async () => {
      invalidateBodyScanList({ reason: "upload_success", categories: "all" });
    });
    await settle();

    const row = lastSummaries!.rows.find((r) => r.category.type === "inbody")!;
    expect(row.supportingCopy).not.toBe("No scans yet");
    expect(row.supportingCopy).toMatch(/^Latest /);
    expect(row.hasScans).toBe(true);
  });

  it("refetches Needs review → Verified after confirm_success without remount", async () => {
    let verified = false;
    mockGetBodyScans.mockImplementation(
      async (_token: string, opts?: { scanType?: BodyScanType }) => {
        if (opts?.scanType !== "dxa") {
          return { ok: true, status: 200, requestId: "r", json: emptyPage() };
        }
        return {
          ok: true,
          status: 200,
          requestId: "r",
          json: pageWith(
            item({
              id: "d1",
              scanType: "dxa",
              status: verified ? "verified" : "needs_review",
            }),
          ),
        };
      },
    );

    await act(async () => {
      renderer.create(React.createElement(SummariesHarness));
    });
    await settle();
    expect(lastSummaries?.rows.find((r) => r.category.type === "dxa")!.supportingCopy).toMatch(
      /Needs review/,
    );

    verified = true;
    await act(async () => {
      invalidateBodyScanList({ reason: "confirm_success", categories: ["dxa"] });
    });
    await settle();
    expect(lastSummaries?.rows.find((r) => r.category.type === "dxa")!.supportingCopy).toMatch(
      /Verified/,
    );
  });

  it("resets Other history and refreshes InBody after type-change invalidation", async () => {
    const otherScan = item({ id: "s1", scanType: "other", status: "needs_review" });
    const inbodyScan = item({ id: "s1", scanType: "inbody", status: "verified" });
    let moved = false;

    mockGetBodyScans.mockImplementation(async (_token: string, opts?: { scanType?: BodyScanType }) => {
      if (opts?.scanType === "other") {
        return {
          ok: true,
          status: 200,
          requestId: "r",
          json: moved ? emptyPage() : pageWith(otherScan),
        };
      }
      if (opts?.scanType === "inbody") {
        return {
          ok: true,
          status: 200,
          requestId: "r",
          json: moved ? pageWith(inbodyScan) : emptyPage(),
        };
      }
      return { ok: true, status: 200, requestId: "r", json: emptyPage() };
    });

    await act(async () => {
      renderer.create(React.createElement(CombinedHarness));
    });
    await settle();
    expect(lastHistory?.status).toBe("ready");
    expect(lastHistory?.status === "ready" && lastHistory.items).toHaveLength(1);
    expect(lastSummaries?.rows.find((r) => r.category.type === "inbody")!.hasScans).toBe(false);

    moved = true;
    await act(async () => {
      invalidateBodyScanList({
        reason: "scan_type_changed",
        categories: ["other", "inbody"],
      });
    });
    await settle();

    expect(lastHistory?.isProvenEmpty).toBe(true);
    expect(lastSummaries?.rows.find((r) => r.category.type === "inbody")!.hasScans).toBe(true);
    expect(lastSummaries?.rows.find((r) => r.category.type === "other")!.hasScans).toBe(false);
  });

  it("history page reset does not append onto stale pages", async () => {
    let generation = 0;
    mockGetBodyScans.mockImplementation(async (_token: string, opts?: { cursor?: string | null }) => {
      if (opts?.cursor) {
        return {
          ok: true,
          status: 200,
          requestId: "r",
          json: {
            ok: true,
            items: [item({ id: `page2_${generation}`, scanType: "dxa", status: "verified" })],
            nextCursor: null,
            hasMore: false,
          },
        };
      }
      return {
        ok: true,
        status: 200,
        requestId: "r",
        json: {
          ok: true,
          items: [item({ id: `page1_${generation}`, scanType: "dxa", status: "needs_review" })],
          nextCursor: "cursor_a",
          hasMore: true,
        },
      };
    });

    await act(async () => {
      renderer.create(React.createElement(HistoryHarness, { scanType: "dxa" }));
    });
    await settle();
    expect(lastHistory?.status).toBe("ready");

    await act(async () => {
      lastHistory!.loadMore();
    });
    await settle();
    expect(lastHistory?.status === "ready" && lastHistory.items.length).toBe(2);

    generation = 1;
    await act(async () => {
      invalidateBodyScanList({ reason: "reprocess_success", categories: ["dxa"] });
    });
    await settle();

    expect(lastHistory?.status).toBe("ready");
    if (lastHistory?.status === "ready") {
      expect(lastHistory.items.map((i) => i.id)).toEqual(["page1_1"]);
      expect(lastHistory.hasMore).toBe(true);
    }
  });
});
