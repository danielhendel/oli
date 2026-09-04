/**
 * Deletion-pending server gate (ADR Account Deletion Lifecycle v1).
 * Blocks normal product APIs while an account deletion is queued/in_progress.
 */

import type { NextFunction, Response } from "express";

import { hasActivePendingDeletion } from "../lib/account/deleteStatus";
import type { AuthedRequest } from "./auth";
import { isDeletionControlAllowlisted } from "./deletionPendingAllowlist";

export { isDeletionControlAllowlisted } from "./deletionPendingAllowlist";

function pathnameOf(req: AuthedRequest): string {
  const raw = (req.originalUrl ?? req.url ?? "").split("?")[0] ?? "";
  return raw.length > 0 ? raw : "/";
}

export const deletionPendingGate = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  const uid = req.uid;
  if (!uid) return next();

  const pathname = pathnameOf(req);
  if (isDeletionControlAllowlisted(req.method, pathname)) {
    return next();
  }

  try {
    const pending = await hasActivePendingDeletion(uid);
    if (!pending) return next();
  } catch {
    // Fail closed for product routes when the gate cannot be evaluated.
    const rid = req.rid ?? res.getHeader("x-request-id")?.toString() ?? "missing";
    return res.status(503).json({
      ok: false as const,
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Account status temporarily unavailable. Try again.",
        requestId: rid,
      },
    });
  }

  const rid = req.rid ?? res.getHeader("x-request-id")?.toString() ?? "missing";
  return res.status(403).json({
    ok: false as const,
    error: {
      code: "ACCOUNT_DELETION_PENDING",
      message: "Account deletion is in progress.",
      requestId: rid,
    },
  });
};
