/**
 * Sprint 2 — Fail-closed UI gate: only renders server truth when status is ready.
 * Invalid/error states render explicit error UI, never partial data.
 */
import React from "react";
import type { FailureKind } from "@/lib/api/http";
/** Phase 1 Lock #3: Canonical readiness vocabulary. */
export type FailClosedOutcome<T> = {
    status: "partial";
} | {
    status: "error";
    error: string;
    requestId: string | null;
    reason: FailureKind;
} | {
    status: "ready";
    data: T;
} | {
    status: "missing";
};
export type FailClosedProps<T> = {
    outcome: FailClosedOutcome<T>;
    onRetry?: () => void;
    loadingMessage?: string;
    missingMessage?: string;
    children: (data: T) => React.ReactNode;
};
export declare function FailClosed<T>({ outcome, onRetry, loadingMessage, missingMessage, children, }: FailClosedProps<T>): React.ReactNode;
//# sourceMappingURL=FailClosed.d.ts.map