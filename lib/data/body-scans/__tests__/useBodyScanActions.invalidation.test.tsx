/**
 * Publisher contract: mutations emit unified Body Scan list invalidation.
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

import {
  __testing_resetBodyScanListInvalidate,
  subscribeBodyScanListInvalidation,
  type BodyScanListInvalidation,
} from "../bodyScanListInvalidate";

const mockConfirm = jest.fn();
const mockReprocess = jest.fn();
const mockDelete = jest.fn();
const mockGetIdToken = jest.fn(async () => "token");
const stableAuth = {
  user: { uid: "user_a" },
  initializing: false,
  getIdToken: (...args: unknown[]) => mockGetIdToken(...args),
};

jest.mock("@/lib/api/bodyScans", () => ({
  confirmBodyScan: (...args: unknown[]) => mockConfirm(...args),
  reprocessBodyScan: (...args: unknown[]) => mockReprocess(...args),
  deleteBodyScan: (...args: unknown[]) => mockDelete(...args),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => stableAuth,
}));

jest.mock("@/lib/data/body-scans/bodyScanOriginalCache", () => ({
  clearBodyScanOriginalCacheForDocument: jest.fn(async () => undefined),
}));

jest.mock("@/lib/data/documents/documentListInvalidate", () => ({
  markDocumentDeleted: jest.fn(),
}));

import { useBodyScanActions } from "../useBodyScanActions";

describe("useBodyScanActions invalidation publishers", () => {
  beforeEach(() => {
    __testing_resetBodyScanListInvalidate();
    mockConfirm.mockReset();
    mockReprocess.mockReset();
    mockDelete.mockReset();
  });

  it("publishes confirm_success / scan_type_changed only after OK", async () => {
    const events: BodyScanListInvalidation[] = [];
    subscribeBodyScanListInvalidation((e) => events.push(e));

    let api!: ReturnType<typeof useBodyScanActions>;
    function Harness() {
      api = useBodyScanActions("scan_1");
      return null;
    }
    await act(async () => {
      renderer.create(<Harness />);
    });

    mockConfirm.mockResolvedValueOnce({ ok: false, status: 422 });
    await act(async () => {
      await api.confirm({ acknowledgedFieldIds: [] }, { previousScanType: "other" });
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(events).toHaveLength(0);

    mockConfirm.mockResolvedValueOnce({ ok: true, status: 200 });
    await act(async () => {
      await api.confirm(
        { acknowledgedFieldIds: [], scanType: "inbody" },
        { previousScanType: "other" },
      );
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(events).toEqual([
      { reason: "scan_type_changed", categories: ["other", "inbody"] },
    ]);
  });

  it("publishes reprocess_success all-categories after OK", async () => {
    const events: BodyScanListInvalidation[] = [];
    subscribeBodyScanListInvalidation((e) => events.push(e));
    mockReprocess.mockResolvedValueOnce({ ok: true, status: 200 });

    let api!: ReturnType<typeof useBodyScanActions>;
    function Harness() {
      api = useBodyScanActions("scan_1");
      return null;
    }
    await act(async () => {
      renderer.create(<Harness />);
    });
    await act(async () => {
      await api.reprocess();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(events).toEqual([{ reason: "reprocess_success", categories: "all" }]);
  });

  it("publishes delete_success with known category after OK", async () => {
    const events: BodyScanListInvalidation[] = [];
    subscribeBodyScanListInvalidation((e) => events.push(e));
    mockDelete.mockResolvedValueOnce({ ok: true, status: 200 });

    let api!: ReturnType<typeof useBodyScanActions>;
    function Harness() {
      api = useBodyScanActions("scan_1");
      return null;
    }
    await act(async () => {
      renderer.create(<Harness />);
    });
    await act(async () => {
      await api.remove({ scanType: "dxa" });
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(events).toEqual([{ reason: "delete_success", categories: ["dxa"] }]);
  });
});
