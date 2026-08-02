/**
 * Reproduces Accept appearing as a no-op when the client relied only on refetch
 * without applying the server-confirmed candidate status to local review detail.
 */
import React, { useEffect, useRef } from "react";
import { act } from "react";
import renderer from "react-test-renderer";

import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getLabReviewDetail,
  patchLabReviewCandidate,
  rejectLabReviewCandidates,
} from "@/lib/api/labsReviews";
import { useLabReviewDetail } from "@/lib/data/labs/useLabReviewDetail";
import type { LabReviewDetailDto } from "@/lib/contracts";

jest.mock("@/lib/api/labsReviews", () => ({
  getLabReviewDetail: jest.fn(),
  patchLabReviewCandidate: jest.fn(),
  rejectLabReviewCandidates: jest.fn(),
  acceptLabReview: jest.fn(),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/data/labs/labReviewMutationTelemetry", () => ({
  emitLabReviewMutationTelemetry: jest.fn(),
  redactLabsToken: (s: string) => `t_${s.length}`,
}));

const mockGet = getLabReviewDetail as jest.MockedFunction<typeof getLabReviewDetail>;
const mockPatch = patchLabReviewCandidate as jest.MockedFunction<typeof patchLabReviewCandidate>;
const mockReject = rejectLabReviewCandidates as jest.MockedFunction<typeof rejectLabReviewCandidates>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function detailDto(status: "pending_review" | "user_accepted" | "rejected" = "pending_review", reviewVersion = 0): LabReviewDetailDto {
  return {
    ok: true,
    summary: {
      documentId: "doc_review_1",
      safeDisplayFilename: "Quest.pdf",
      status: "in_progress",
      documentStatus: "review_needed",
      collectedAt: null,
      reportedAt: null,
      fasting: null,
      laboratoryName: "Quest",
      matchedCount: 1,
      unmatchedCount: 0,
      warningCount: 0,
      extractionVersion: "v1",
      reviewVersion,
    },
    metadata: { confidence: 0.9 },
    candidates: [
      {
        id: "cand_1",
        rawAnalyteLabel: "GLUCOSE",
        displayName: "Glucose",
        canonicalMetricId: "glucose_fasting",
        rawResult: "92",
        result: { kind: "numeric", value: 92, comparator: "eq" },
        unit: "mg/dL",
        rawReferenceRange: "65-99",
        flagLabel: null,
        panelName: null,
        sourcePage: 1,
        confidence: 0.95,
        warnings: [],
        reviewStatus: status,
        matchGroup: "matched",
      },
    ],
    unmatched: [],
    warningMessages: [],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn().mockResolvedValue("token"),
  } as unknown as ReturnType<typeof useAuth>);
  mockGet.mockResolvedValue({
    ok: true,
    status: 200,
    requestId: "r1",
    json: detailDto("pending_review", 0),
  });
});

type HookState = ReturnType<typeof useLabReviewDetail>;

function Harness(props: { onState: (s: HookState) => void }) {
  const state = useLabReviewDetail({ documentId: "doc_review_1" });
  const ref = useRef(props.onState);
  ref.current = props.onState;
  useEffect(() => {
    ref.current(state);
  }, [state]);
  return null;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useLabReviewDetail candidate mutations", () => {
  it("updates Pending → Accepted from server-confirmed PATCH without waiting on refetch", async () => {
    let latest: HookState | null = null;
    await act(async () => {
      renderer.create(<Harness onState={(s) => { latest = s; }} />);
    });
    await flush();
    expect(latest?.status).toBe("ready");
    if (latest?.status !== "ready") throw new Error("expected ready");
    expect(latest.data.candidates[0]!.reviewStatus).toBe("pending_review");

    // Refetch deliberately returns stale pending — previously this made Accept look like a no-op.
    mockPatch.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r2",
      json: { ok: true as const, reviewVersion: 1 },
    });
    mockGet.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r3",
      json: detailDto("pending_review", 0),
    });

    let result!: Awaited<ReturnType<HookState["patchCandidate"]>>;
    await act(async () => {
      result = await latest!.patchCandidate("cand_1", { reviewStatus: "user_accepted" });
    });
    await flush();

    expect(mockPatch).toHaveBeenCalledTimes(1);
    expect(mockPatch.mock.calls[0]![3]).toEqual({ reviewStatus: "user_accepted", reviewVersion: 0 });
    expect(result.ok).toBe(true);
    expect(latest?.status).toBe("ready");
    if (latest?.status !== "ready") throw new Error("expected ready after patch");
    expect(latest.data.candidates[0]!.reviewStatus).toBe("user_accepted");
    expect(latest.reviewVersion).toBe(1);
    // Stale GET with older reviewVersion must not restore pending.
    expect(latest.data.candidates[0]!.reviewStatus).not.toBe("pending_review");
  });

  it("keeps Pending on mutation failure", async () => {
    let latest: HookState | null = null;
    await act(async () => {
      renderer.create(<Harness onState={(s) => { latest = s; }} />);
    });
    await flush();

    mockPatch.mockResolvedValue({
      ok: false,
      status: 500,
      kind: "http",
      error: "Server error",
      requestId: "r-err",
    });

    let result!: Awaited<ReturnType<HookState["patchCandidate"]>>;
    await act(async () => {
      result = await latest!.patchCandidate("cand_1", { reviewStatus: "user_accepted" });
    });
    await flush();

    expect(result.ok).toBe(false);
    expect(latest?.status).toBe("ready");
    if (latest?.status !== "ready") throw new Error("expected ready");
    expect(latest.data.candidates[0]!.reviewStatus).toBe("pending_review");
  });

  it("marks rejected after reject mutation and ignores stale lower-version refetch", async () => {
    let latest: HookState | null = null;
    await act(async () => {
      renderer.create(<Harness onState={(s) => { latest = s; }} />);
    });
    await flush();

    mockReject.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r4",
      json: { ok: true as const, reviewVersion: 2 },
    });
    mockGet.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r5",
      json: detailDto("pending_review", 0),
    });

    await act(async () => {
      await latest!.rejectCandidates(["cand_1"]);
    });
    await flush();

    expect(latest?.status).toBe("ready");
    if (latest?.status !== "ready") throw new Error("expected ready");
    expect(latest.data.candidates[0]!.reviewStatus).toBe("rejected");
    expect(latest.reviewVersion).toBe(2);
  });

  it("refetches on 409 conflict without applying local accept", async () => {
    let latest: HookState | null = null;
    await act(async () => {
      renderer.create(<Harness onState={(s) => { latest = s; }} />);
    });
    await flush();
    mockGet.mockClear();

    mockPatch.mockResolvedValue({
      ok: false,
      status: 409,
      kind: "http",
      error: "Conflict",
      requestId: "r409",
      json: { ok: false, error: { code: "REVIEW_VERSION_CONFLICT" } },
    });
    mockGet.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r6",
      json: detailDto("user_accepted", 3),
    });

    let result!: Awaited<ReturnType<HookState["patchCandidate"]>>;
    await act(async () => {
      result = await latest!.patchCandidate("cand_1", { reviewStatus: "user_accepted" });
    });
    await flush();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.conflict).toBe(true);
    expect(mockGet).toHaveBeenCalled();
  });
});
