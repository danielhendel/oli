/**
 * Quest text metadata extraction (Phase 3D-A).
 * Never emits patient identifiers into candidates.
 */

import type { LabDatePrecision, LabReportMetadataCandidate } from "@oli/contracts";

function parseQuestDateTime(raw: string): { iso: string; precision: LabDatePrecision } | null {
  // Quest forms:
  //   01/15/2024 08:30 AM
  //   10/15/2024 / 06:16 CDT
  //   2024-01-15
  // Store UTC wall-clock fields from the source calendar/time. Never invent device TZ.
  const mdy =
    /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*\/?\s*(\d{1,2}):(\d{2})(?:\s*(AM|PM))?(?:\s*([A-Z]{2,5}))?)?/i.exec(
      raw,
    );
  if (mdy) {
    const month = Number(mdy[1]);
    const day = Number(mdy[2]);
    const year = Number(mdy[3]);
    const hasTime = Boolean(mdy[4] && mdy[5]);
    if (!hasTime) {
      const iso = new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).toISOString();
      return { iso, precision: "date_only" };
    }
    let hour = Number(mdy[4]);
    const minute = Number(mdy[5]);
    const ampm = mdy[6]?.toUpperCase();
    const tz = mdy[7]?.toUpperCase() ?? null;
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    // Keep source wall-clock in UTC fields so calendar date formatting stays faithful.
    const iso = new Date(Date.UTC(year, month - 1, day, hour, minute, 0)).toISOString();
    return {
      iso,
      precision: tz ? "date_time_with_timezone" : "date_time_without_timezone",
    };
  }
  const ymd = /(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (ymd) {
    const iso = new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 0, 0, 0)).toISOString();
    return { iso, precision: "date_only" };
  }
  return null;
}

function fieldAfter(label: RegExp, lines: string[]): string | null {
  for (const line of lines) {
    if (!label.test(line)) continue;
    const parts = line.split(/:\s*/);
    if (parts.length >= 2) return parts.slice(1).join(":").trim() || null;
  }
  return null;
}

function parseFasting(raw: string | null): boolean | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();
  if (/^(y|yes)$/.test(t)) return true;
  if (/^(n|no)$/.test(t)) return false;
  if (/non-?fasting/.test(t)) return false;
  if (/fasting/.test(t) && !/non/.test(t)) return true;
  return null;
}

/**
 * Extract reviewable report metadata candidates from segmented Quest lines.
 */
export function extractQuestReportMetadata(args: {
  metadataLines: string[];
  panelNames: string[];
  pageCount: number;
  formatFamily: string | null;
  formatFamilyVersion: string | null;
  confidence: number;
}): LabReportMetadataCandidate {
  const lines = args.metadataLines;
  const collectedRaw = fieldAfter(/collected/i, lines);
  const receivedRaw = fieldAfter(/received/i, lines);
  const reportedRaw = fieldAfter(/reported/i, lines);
  const fastingRaw = fieldAfter(/fasting/i, lines);
  const specimenRaw = fieldAfter(/specimen/i, lines);
  const statusRaw = fieldAfter(/report\s+status/i, lines);

  let laboratoryName: string | null = null;
  const allLines = lines;
  // Also accept laboratory from common header strings that may not be in metadataLines.
  for (const line of allLines) {
    if (/quest\s+diagnostics/i.test(line)) {
      laboratoryName = "Quest Diagnostics";
      break;
    }
    if (/directlabs/i.test(line)) {
      laboratoryName = "DirectLabs / Quest Diagnostics";
      break;
    }
    if (/cleveland\s+heartlab/i.test(line)) {
      laboratoryName = "Cleveland HeartLab";
    }
  }

  const fasting: boolean | null = parseFasting(fastingRaw);

  const fieldConfidence: Record<string, number> = {};
  const collectedParsed = collectedRaw ? parseQuestDateTime(collectedRaw) : null;
  const receivedParsed = receivedRaw ? parseQuestDateTime(receivedRaw) : null;
  const reportedParsed = reportedRaw ? parseQuestDateTime(reportedRaw) : null;
  const collectedAt = collectedParsed?.iso ?? null;
  const receivedAt = receivedParsed?.iso ?? null;
  const reportedAt = reportedParsed?.iso ?? null;
  if (collectedAt) fieldConfidence.collectedAt = 0.9;
  if (receivedAt) fieldConfidence.receivedAt = 0.85;
  if (reportedAt) fieldConfidence.reportedAt = 0.9;
  if (fasting !== null) fieldConfidence.fasting = 0.85;
  if (laboratoryName) fieldConfidence.laboratoryName = 0.95;

  return {
    reportStatus: statusRaw,
    collectedAt,
    receivedAt,
    reportedAt,
    collectedAtPrecision: collectedParsed?.precision ?? null,
    fasting,
    laboratoryName,
    performingLaboratories: laboratoryName
      ? [{ name: laboratoryName, code: null }]
      : [],
    specimenType: specimenRaw && !/patient|dob|phone/i.test(specimenRaw) ? specimenRaw : null,
    panelNames: args.panelNames,
    reportFamily: args.formatFamily,
    formatFamilyVersion: args.formatFamilyVersion,
    pageCount: args.pageCount,
    confidence: args.confidence,
    fieldConfidence,
  };
}
