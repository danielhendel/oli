/**
 * Deterministic history-point identity — one genuine source result → one active point.
 */

import { createHash } from "node:crypto";

export const LAB_HISTORY_POINT_IDENTITY_VERSION = "1.0.0";

export type LabHistoryPointIdentityInput = {
  userId: string;
  canonicalMetricId: string;
  sourceDocumentId: string;
  sourceCandidateId: string;
  sourceCalendarDate: string;
  panelId: string;
  specimenType: string;
  methodId: string;
  measuredOrCalculated: string;
};

export function buildLabHistoryPointIdentityInput(args: {
  userId: string;
  canonicalMetricId: string | null;
  sourceDocumentId: string;
  sourceCandidateId: string;
  sourceCalendarDate: string;
  panelId?: string | null;
  specimenType?: string | null;
  methodId?: string | null;
  measuredOrCalculated?: string | null;
}): LabHistoryPointIdentityInput {
  return {
    userId: args.userId,
    canonicalMetricId: args.canonicalMetricId ?? "metric_unknown",
    sourceDocumentId: args.sourceDocumentId,
    sourceCandidateId: args.sourceCandidateId,
    sourceCalendarDate: args.sourceCalendarDate,
    panelId: args.panelId ?? "panel_unknown",
    specimenType: args.specimenType ?? "specimen_unknown",
    methodId: args.methodId ?? "method_unknown",
    measuredOrCalculated: args.measuredOrCalculated ?? "measured_unknown",
  };
}

export function computeLabHistoryPointId(input: LabHistoryPointIdentityInput): string {
  const parts = [
    LAB_HISTORY_POINT_IDENTITY_VERSION,
    input.userId,
    input.canonicalMetricId,
    input.sourceDocumentId,
    input.sourceCandidateId,
    input.sourceCalendarDate,
    input.panelId,
    input.specimenType,
    input.methodId,
    input.measuredOrCalculated,
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export function computeLabHistoryPointFingerprint(
  input: LabHistoryPointIdentityInput,
): string {
  return computeLabHistoryPointId(input);
}
