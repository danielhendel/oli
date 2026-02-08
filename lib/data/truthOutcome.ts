// lib/data/truthOutcome.ts
import type { ApiFailure, ApiResult } from "@/lib/api/http";
import type { FailureKind } from "@/lib/api/http";

export type TruthOutcome<T> =
  | { status: "ready"; data: T }
  | { status: "missing" }
  | { status: "error"; error: string; requestId: string | null; reason: FailureKind };

const isNotFound = (res: ApiFailure): boolean => res.kind === "http" && res.status === 404;

export function truthOutcomeFromApiResult<T>(res: ApiResult<T>): TruthOutcome<T> {
  if (res.ok) return { status: "ready", data: res.json };

  if (isNotFound(res)) return { status: "missing" };

  return {
    status: "error",
    error: res.error,
    requestId: res.requestId,
    reason: res.kind,
  };
}
