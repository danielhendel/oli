// lib/data/labs/useLabReviewDetail.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  acceptLabReview,
  getLabReviewDetail,
  patchLabReviewCandidate,
  rejectLabReviewCandidates,
} from "@/lib/api/labsReviews";
import type {
  AcceptLabReviewRequest,
  LabReviewDetailDto,
  PatchLabReviewCandidateRequest,
} from "@/lib/contracts";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { GetOptions } from "@/lib/api/http";

type State =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: LabReviewDetailDto; reviewVersion: number };

export type UseLabReviewDetailOptions = { documentId: string; enabled?: boolean } & GetOptions;

export type LabReviewMutationResult =
  | { ok: true; reviewVersion: number }
  | { ok: false; error: string; requestId: string | null; conflict?: boolean };

export function useLabReviewDetail(opts: UseLabReviewDetailOptions): State & {
  refetch: (opts?: GetOptions) => void;
  patchCandidate: (
    candidateId: string,
    body: Omit<PatchLabReviewCandidateRequest, "reviewVersion">,
  ) => Promise<LabReviewMutationResult>;
  rejectCandidates: (candidateIds: string[]) => Promise<LabReviewMutationResult>;
  finishReview: (candidateIds: string[]) => Promise<LabReviewMutationResult & { acceptedCount?: number }>;
} {
  const { documentId, enabled = true } = opts;
  const { user, initializing, getIdToken } = useAuth();
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const reqSeq = useRef(0);
  const reviewVersionRef = useRef(0);
  const [state, setState] = useState<State>({ status: "partial" });

  const fetchOnce = useCallback(
    async (refetchOpts?: GetOptions) => {
      const seq = ++reqSeq.current;
      const safeSet = (next: State) => {
        if (seq === reqSeq.current) setState(next);
      };

      if (!enabled || !documentId) {
        safeSet({ status: "partial" });
        return;
      }

      if (initializing || !user) {
        if (state.status !== "ready") safeSet({ status: "partial" });
        return;
      }

      const token = await getIdToken(false);
      if (seq !== reqSeq.current) return;
      if (!token) {
        safeSet({ status: "error", error: "No auth token", requestId: null });
        return;
      }

      if (state.status !== "ready") safeSet({ status: "partial" });

      const res = await getLabReviewDetail(token, documentId, { ...optsRef.current, ...refetchOpts });
      if (seq !== reqSeq.current) return;

      const outcome = truthOutcomeFromApiResult(res);
      if (outcome.status === "ready") {
        reviewVersionRef.current = outcome.data.summary.reviewVersion;
        safeSet({
          status: "ready",
          data: outcome.data,
          reviewVersion: outcome.data.summary.reviewVersion,
        });
        return;
      }
      if (outcome.status === "missing") {
        safeSet({ status: "error", error: "Review not found", requestId: null });
        return;
      }
      safeSet({ status: "error", error: outcome.error, requestId: outcome.requestId });
    },
    [documentId, enabled, getIdToken, initializing, state.status, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, user?.uid, documentId, enabled]);

  const mapMutationResult = useCallback(
    (res: Awaited<ReturnType<typeof patchLabReviewCandidate>>): LabReviewMutationResult => {
      if (res.ok) {
        reviewVersionRef.current = res.json.reviewVersion;
        return { ok: true, reviewVersion: res.json.reviewVersion };
      }
      const conflict =
        res.kind === "http" && res.status === 409 && JSON.stringify(res.json ?? {}).includes("REVIEW_VERSION_CONFLICT");
      return { ok: false, error: res.error, requestId: res.requestId, ...(conflict ? { conflict: true } : {}) };
    },
    [],
  );

  const patchCandidate = useCallback(
    async (candidateId: string, body: Omit<PatchLabReviewCandidateRequest, "reviewVersion">) => {
      const token = await getIdToken(false);
      if (!token) return { ok: false as const, error: "No auth token", requestId: null };
      const res = await patchLabReviewCandidate(token, documentId, candidateId, {
        ...body,
        reviewVersion: reviewVersionRef.current,
      });
      const mapped = mapMutationResult(res);
      if (mapped.ok) {
        await fetchOnce({ cacheBust: String(Date.now()) });
      }
      return mapped;
    },
    [documentId, fetchOnce, getIdToken, mapMutationResult],
  );

  const rejectCandidates = useCallback(
    async (candidateIds: string[]) => {
      const token = await getIdToken(false);
      if (!token) return { ok: false as const, error: "No auth token", requestId: null };
      const res = await rejectLabReviewCandidates(token, documentId, {
        reviewVersion: reviewVersionRef.current,
        candidateIds,
      });
      const mapped = mapMutationResult(res);
      if (mapped.ok) {
        await fetchOnce({ cacheBust: String(Date.now()) });
      }
      return mapped;
    },
    [documentId, fetchOnce, getIdToken, mapMutationResult],
  );

  const finishReview = useCallback(
    async (candidateIds: string[]) => {
      const token = await getIdToken(false);
      if (!token) return { ok: false as const, error: "No auth token", requestId: null };
      const body: AcceptLabReviewRequest = {
        reviewVersion: reviewVersionRef.current,
        candidateIds,
        confirmAcceptSelected: true,
      };
      const res = await acceptLabReview(token, documentId, body);
      if (res.ok) {
        reviewVersionRef.current = res.json.reviewVersion;
        await fetchOnce({ cacheBust: String(Date.now()) });
        return {
          ok: true as const,
          reviewVersion: res.json.reviewVersion,
          acceptedCount: res.json.acceptedCount,
        };
      }
      const conflict =
        res.kind === "http" && res.status === 409 && JSON.stringify(res.json ?? {}).includes("REVIEW_VERSION_CONFLICT");
      return { ok: false as const, error: res.error, requestId: res.requestId, ...(conflict ? { conflict: true } : {}) };
    },
    [documentId, fetchOnce, getIdToken],
  );

  return useMemo(
    () => ({
      ...state,
      refetch: fetchOnce,
      patchCandidate,
      rejectCandidates,
      finishReview,
    }),
    [state, fetchOnce, patchCandidate, rejectCandidates, finishReview],
  );
}
