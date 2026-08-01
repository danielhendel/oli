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
  LabCandidateReviewStatus,
  LabReviewDetailDto,
  PatchLabReviewCandidateRequest,
} from "@/lib/contracts";
import { applyLabReviewCandidateStatus } from "@/lib/data/labs/applyLabReviewCandidateStatus";
import {
  emitLabReviewMutationTelemetry,
  redactLabsToken,
  type LabReviewCandidateAction,
} from "@/lib/data/labs/labReviewMutationTelemetry";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { GetOptions } from "@/lib/api/http";

type State =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: LabReviewDetailDto; reviewVersion: number };

export type UseLabReviewDetailOptions = { documentId: string; enabled?: boolean } & GetOptions;

export type LabReviewMutationResult =
  | { ok: true; reviewVersion: number }
  | { ok: false; error: string; requestId: string | null; conflict?: boolean; httpStatus?: number };

function resolveNextStatus(
  body: Omit<PatchLabReviewCandidateRequest, "reviewVersion">,
): LabCandidateReviewStatus {
  if (body.correction) return "corrected";
  if (body.reviewStatus) return body.reviewStatus;
  return "pending";
}

function actionFromBody(
  body: Omit<PatchLabReviewCandidateRequest, "reviewVersion">,
): LabReviewCandidateAction {
  if (body.correction || body.reviewStatus === "corrected") return "edit";
  if (body.reviewStatus === "rejected") return "reject";
  return "accept";
}

function priorStatusForCandidate(data: LabReviewDetailDto | null, candidateId: string): string {
  if (!data) return "unknown";
  const hit = [...data.candidates, ...data.unmatched].find((c) => c.id === candidateId);
  return hit?.reviewStatus ?? "unknown";
}

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
  const stateRef = useRef<State>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
        if (stateRef.current.status !== "ready") safeSet({ status: "partial" });
        return;
      }

      const token = await getIdToken(false);
      if (seq !== reqSeq.current) return;
      if (!token) {
        safeSet({ status: "error", error: "No auth token", requestId: null });
        return;
      }

      if (stateRef.current.status !== "ready") safeSet({ status: "partial" });

      const res = await getLabReviewDetail(token, documentId, { ...optsRef.current, ...refetchOpts });
      if (seq !== reqSeq.current) return;

      const outcome = truthOutcomeFromApiResult(res);
      if (outcome.status === "ready") {
        const incomingVersion = outcome.data.summary.reviewVersion;
        // Monotonic guard: never let a stale GET restore an older reviewVersion / statuses.
        if (incomingVersion < reviewVersionRef.current) {
          return;
        }
        reviewVersionRef.current = incomingVersion;
        safeSet({
          status: "ready",
          data: outcome.data,
          reviewVersion: incomingVersion,
        });
        return;
      }
      if (outcome.status === "missing") {
        safeSet({ status: "error", error: "Review not found", requestId: null });
        return;
      }
      safeSet({ status: "error", error: outcome.error, requestId: outcome.requestId });
    },
    [documentId, enabled, getIdToken, initializing, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, user?.uid, documentId, enabled]);

  const applyConfirmedCandidateUpdate = useCallback(
    (
      candidateId: string,
      nextStatus: LabCandidateReviewStatus,
      reviewVersion: number,
      action: LabReviewCandidateAction,
    ) => {
      reviewVersionRef.current = reviewVersion;
      setState((prev) => {
        if (prev.status !== "ready") return prev;
        const data = applyLabReviewCandidateStatus(prev.data, candidateId, nextStatus, reviewVersion);
        return { status: "ready", data, reviewVersion };
      });
      emitLabReviewMutationTelemetry({
        operation: "lab_review_cache_updated",
        documentToken: redactLabsToken(documentId),
        candidateToken: redactLabsToken(candidateId),
        action,
        nextStatus,
        reviewVersion,
      });
    },
    [documentId],
  );

  const mapMutationResult = useCallback(
    (res: Awaited<ReturnType<typeof patchLabReviewCandidate>>): LabReviewMutationResult => {
      if (res.ok) {
        return { ok: true, reviewVersion: res.json.reviewVersion };
      }
      const conflict =
        res.kind === "http" && res.status === 409 && JSON.stringify(res.json ?? {}).includes("REVIEW_VERSION_CONFLICT");
      return {
        ok: false,
        error: res.error,
        requestId: res.requestId,
        httpStatus: res.status,
        ...(conflict ? { conflict: true } : {}),
      };
    },
    [],
  );

  const patchCandidate = useCallback(
    async (candidateId: string, body: Omit<PatchLabReviewCandidateRequest, "reviewVersion">) => {
      const startedAt = Date.now();
      const action = actionFromBody(body);
      const nextStatus = resolveNextStatus(body);
      const priorStatus = priorStatusForCandidate(
        stateRef.current.status === "ready" ? stateRef.current.data : null,
        candidateId,
      );
      const reviewVersion = reviewVersionRef.current;

      emitLabReviewMutationTelemetry({
        operation: "lab_review_candidate_action_started",
        documentToken: redactLabsToken(documentId),
        candidateToken: redactLabsToken(candidateId),
        action,
        priorStatus,
        reviewVersion,
      });

      const token = await getIdToken(false);
      if (!token) {
        emitLabReviewMutationTelemetry({
          operation: "lab_review_candidate_action_failed",
          documentToken: redactLabsToken(documentId),
          candidateToken: redactLabsToken(candidateId),
          action,
          priorStatus,
          httpStatus: 0,
          safeErrorCode: "NO_AUTH_TOKEN",
          reviewVersion,
          elapsedMs: Date.now() - startedAt,
        });
        return { ok: false as const, error: "No auth token", requestId: null, httpStatus: 0 };
      }

      const res = await patchLabReviewCandidate(token, documentId, candidateId, {
        ...body,
        reviewVersion,
      });
      const mapped = mapMutationResult(res);
      const elapsedMs = Date.now() - startedAt;

      if (mapped.ok) {
        emitLabReviewMutationTelemetry({
          operation: "lab_review_candidate_action_completed",
          documentToken: redactLabsToken(documentId),
          candidateToken: redactLabsToken(candidateId),
          action,
          priorStatus,
          nextStatus,
          httpStatus: res.ok ? res.status : 0,
          reviewVersion: mapped.reviewVersion,
          elapsedMs,
        });
        // Server-confirmed update first — do not wait on refetch to change the row.
        applyConfirmedCandidateUpdate(candidateId, nextStatus, mapped.reviewVersion, action);
        void fetchOnce({ cacheBust: String(Date.now()), noStore: true });
        return mapped;
      }

      emitLabReviewMutationTelemetry({
        operation: "lab_review_candidate_action_failed",
        documentToken: redactLabsToken(documentId),
        candidateToken: redactLabsToken(candidateId),
        action,
        priorStatus,
        httpStatus: mapped.httpStatus ?? 0,
        safeErrorCode: mapped.conflict ? "REVIEW_VERSION_CONFLICT" : "MUTATION_FAILED",
        reviewVersion,
        elapsedMs,
      });

      if (mapped.conflict) {
        void fetchOnce({ cacheBust: String(Date.now()), noStore: true });
      }
      return mapped;
    },
    [applyConfirmedCandidateUpdate, documentId, fetchOnce, getIdToken, mapMutationResult],
  );

  const rejectCandidates = useCallback(
    async (candidateIds: string[]) => {
      const startedAt = Date.now();
      const primaryId = candidateIds[0] ?? "";
      const priorStatus = priorStatusForCandidate(
        stateRef.current.status === "ready" ? stateRef.current.data : null,
        primaryId,
      );
      const reviewVersion = reviewVersionRef.current;

      emitLabReviewMutationTelemetry({
        operation: "lab_review_candidate_action_started",
        documentToken: redactLabsToken(documentId),
        candidateToken: redactLabsToken(primaryId),
        action: "reject",
        priorStatus,
        reviewVersion,
      });

      const token = await getIdToken(false);
      if (!token) {
        return { ok: false as const, error: "No auth token", requestId: null, httpStatus: 0 };
      }
      const idempotencyKey = `labs-reject-${documentId}-${reviewVersion}-${candidateIds.slice().sort().join(",")}`;
      const res = await rejectLabReviewCandidates(
        token,
        documentId,
        {
          reviewVersion,
          candidateIds,
        },
        { idempotencyKey },
      );
      const mapped = mapMutationResult(res);
      const elapsedMs = Date.now() - startedAt;

      if (mapped.ok) {
        emitLabReviewMutationTelemetry({
          operation: "lab_review_candidate_action_completed",
          documentToken: redactLabsToken(documentId),
          candidateToken: redactLabsToken(primaryId),
          action: "reject",
          priorStatus,
          nextStatus: "rejected",
          httpStatus: res.ok ? res.status : 0,
          reviewVersion: mapped.reviewVersion,
          elapsedMs,
        });
        for (const id of candidateIds) {
          applyConfirmedCandidateUpdate(id, "rejected", mapped.reviewVersion, "reject");
        }
        void fetchOnce({ cacheBust: String(Date.now()), noStore: true });
        return mapped;
      }

      emitLabReviewMutationTelemetry({
        operation: "lab_review_candidate_action_failed",
        documentToken: redactLabsToken(documentId),
        candidateToken: redactLabsToken(primaryId),
        action: "reject",
        priorStatus,
        httpStatus: mapped.httpStatus ?? 0,
        safeErrorCode: mapped.conflict ? "REVIEW_VERSION_CONFLICT" : "MUTATION_FAILED",
        reviewVersion,
        elapsedMs,
      });
      if (mapped.conflict) {
        void fetchOnce({ cacheBust: String(Date.now()), noStore: true });
      }
      return mapped;
    },
    [applyConfirmedCandidateUpdate, documentId, fetchOnce, getIdToken, mapMutationResult],
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
      const idempotencyKey = `labs-accept-${documentId}-${reviewVersionRef.current}-${candidateIds.slice().sort().join(",")}`;
      const res = await acceptLabReview(token, documentId, body, { idempotencyKey });
      if (res.ok) {
        reviewVersionRef.current = res.json.reviewVersion;
        await fetchOnce({ cacheBust: String(Date.now()), noStore: true });
        return {
          ok: true as const,
          reviewVersion: res.json.reviewVersion,
          acceptedCount: res.json.acceptedCount,
        };
      }
      const conflict =
        res.kind === "http" && res.status === 409 && JSON.stringify(res.json ?? {}).includes("REVIEW_VERSION_CONFLICT");
      if (conflict) {
        void fetchOnce({ cacheBust: String(Date.now()), noStore: true });
      }
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
