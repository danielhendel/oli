/**
 * Sprint 2 — Fail-closed UI gate: only renders server truth when status is ready.
 * Invalid/error states render explicit error UI, never partial data.
 */
import React from "react";
import type { FailureKind } from "@/lib/api/http";
import { ErrorState, LoadingState, EmptyState } from "./ScreenStates";

/** Phase 1 Lock #3: Canonical readiness vocabulary. */
export type FailClosedOutcome<T> =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null; reason: FailureKind }
  | { status: "ready"; data: T }
  | { status: "missing" };

export type FailClosedProps<T> = {
  outcome: FailClosedOutcome<T>;
  onRetry?: () => void;
  loadingMessage?: string;
  missingMessage?: string;
  children: (data: T) => React.ReactNode;
};

export function FailClosed<T>({
  outcome,
  onRetry,
  loadingMessage = "Loading…",
  missingMessage = "No data",
  children,
}: FailClosedProps<T>): React.ReactNode {
  if (outcome.status === "partial") {
    return <LoadingState message={loadingMessage} />;
  }

  if (outcome.status === "error") {
    return (
      <ErrorState
        message={outcome.error}
        requestId={outcome.requestId}
        {...(onRetry ? { onRetry } : {})}
        isContractError={outcome.reason === "contract"}
      />
    );
  }

  if (outcome.status === "missing") {
    return (
      <EmptyState
        title="No data"
        description={missingMessage}
      />
    );
  }

  return <>{children(outcome.data)}</>;
}
