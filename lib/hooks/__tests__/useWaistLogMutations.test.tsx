/**
 * Waist correction create-before-delete integrity.
 */
import React from "react";
import renderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockGetIdToken = jest.fn(async () => "token");
const mockLogWaist = jest.fn();
const mockDelete = jest.fn();

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    getIdToken: (...args: unknown[]) => mockGetIdToken(...args),
  }),
}));

jest.mock("@/lib/api/usersMe", () => ({
  logWaist: (...args: unknown[]) => mockLogWaist(...args),
}));

jest.mock("@/lib/api/ingest", () => ({
  deleteIngestedRawEventAuthed: (...args: unknown[]) => mockDelete(...args),
}));

jest.mock("@/lib/navigation/refreshBus", () => ({
  emitRefresh: jest.fn(),
}));

import { useWaistLogMutations } from "../useWaistLogMutations";
import { manualWaistCorrectionIdempotencyKey } from "@/lib/events/manualBodyComposition";

describe("useWaistLogMutations correction integrity", () => {
  let mutations!: ReturnType<typeof useWaistLogMutations>;

  function Harness() {
    mutations = useWaistLogMutations();
    return null;
  }

  beforeEach(() => {
    mockGetIdToken.mockClear();
    mockLogWaist.mockReset();
    mockDelete.mockReset();
  });

  const args = {
    rawEventId: "prior_evt",
    observedAtIso: "2026-03-04T12:00:00.000Z",
    waistCircumferenceCm: 80,
    timezone: "UTC",
  };

  async function mount() {
    await act(async () => {
      renderer.create(<Harness />);
      await Promise.resolve();
    });
  }

  it("happy path: create then delete → success", async () => {
    mockLogWaist.mockResolvedValue({ ok: true, json: { ok: true, rawEventId: "repl" } });
    mockDelete.mockResolvedValue({ ok: true });
    await mount();
    let out: Awaited<ReturnType<typeof mutations.updateEntry>> | undefined;
    await act(async () => {
      out = await mutations.updateEntry(args);
    });
    expect(out).toEqual({ ok: true, status: "success" });
    expect(mockLogWaist).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith("prior_evt", "token");
    const key = (mockLogWaist.mock.calls[0] as unknown[])?.[2] as
      | { idempotencyKey?: string }
      | undefined;
    expect(key?.idempotencyKey).toBe(
      manualWaistCorrectionIdempotencyKey({
        priorRawEventId: "prior_evt",
        time: args.observedAtIso,
        timezone: args.timezone,
        waistCircumferenceCm: 80,
      }),
    );
  });

  it("create failure: prior preserved; no delete", async () => {
    mockLogWaist.mockResolvedValue({ ok: false, error: "network" });
    await mount();
    let out: Awaited<ReturnType<typeof mutations.updateEntry>> | undefined;
    await act(async () => {
      out = await mutations.updateEntry(args);
    });
    expect(out?.ok).toBe(false);
    if (out && !out.ok) expect(out.status).toBe("create_failed");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("create timeout after persistence: retry reuses same idempotency key", async () => {
    mockLogWaist
      .mockResolvedValueOnce({ ok: false, error: "timeout" })
      .mockResolvedValueOnce({ ok: true, json: { ok: true, rawEventId: "repl" } });
    mockDelete.mockResolvedValue({ ok: true });
    await mount();
    await act(async () => {
      await mutations.updateEntry(args);
    });
    await act(async () => {
      await mutations.updateEntry(args);
    });
    expect(mockLogWaist).toHaveBeenCalledTimes(2);
    const k1 = ((mockLogWaist.mock.calls[0] as unknown[])?.[2] as { idempotencyKey?: string })
      ?.idempotencyKey;
    const k2 = ((mockLogWaist.mock.calls[1] as unknown[])?.[2] as { idempotencyKey?: string })
      ?.idempotencyKey;
    expect(k1).toBe(k2);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it("delete failure: partial status + retry cleanup converges", async () => {
    mockLogWaist.mockResolvedValue({ ok: true, json: { ok: true, rawEventId: "repl" } });
    mockDelete
      .mockResolvedValueOnce({ ok: false, error: "delete failed" })
      .mockResolvedValueOnce({ ok: true });
    await mount();
    let first: Awaited<ReturnType<typeof mutations.updateEntry>> | undefined;
    await act(async () => {
      first = await mutations.updateEntry(args);
    });
    expect(first?.ok).toBe(false);
    if (first && !first.ok) expect(first.status).toBe("replacement_saved_cleanup_pending");
    expect(mutations.cleanupPending).toBe(true);

    let second: Awaited<ReturnType<typeof mutations.retryCleanup>> | undefined;
    await act(async () => {
      second = await mutations.retryCleanup();
    });
    expect(second).toEqual({ ok: true, status: "retry_converged" });
    expect(mutations.cleanupPending).toBe(false);
    expect(mockLogWaist.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(mockDelete).toHaveBeenCalledTimes(2);
  });

  it("repeated retry after success remains idempotent", async () => {
    mockLogWaist.mockResolvedValue({ ok: true, json: { ok: true, rawEventId: "repl" } });
    mockDelete.mockResolvedValue({ ok: true });
    await mount();
    await act(async () => {
      await mutations.updateEntry(args);
    });
    await act(async () => {
      await mutations.updateEntry(args);
    });
    const keys = mockLogWaist.mock.calls.map(
      (c) => ((c as unknown[])[2] as { idempotencyKey?: string })?.idempotencyKey,
    );
    expect(new Set(keys).size).toBe(1);
  });

  it("changed correction payload gets distinct replacement identity", () => {
    const a = manualWaistCorrectionIdempotencyKey({
      priorRawEventId: "prior_evt",
      time: "2026-03-04T12:00:00.000Z",
      timezone: "UTC",
      waistCircumferenceCm: 80,
    });
    const b = manualWaistCorrectionIdempotencyKey({
      priorRawEventId: "prior_evt",
      time: "2026-03-04T12:00:00.000Z",
      timezone: "UTC",
      waistCircumferenceCm: 81,
    });
    expect(a).not.toBe(b);
  });
});
