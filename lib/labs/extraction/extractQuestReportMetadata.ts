/**
 * Quest text metadata extraction (Phase 3D-A).
 * Never emits patient identifiers into candidates.
 */

import type { LabReportMetadataCandidate } from "../../contracts/labsOs";

function parseQuestDateTime(raw: string): string | null {
  // Common Quest forms: 01/15/2024 08:30 AM  or  2024-01-15
  const mdy = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i.exec(raw);
  if (mdy) {
    const month = Number(mdy[1]);
    const day = Number(mdy[2]);
    const year = Number(mdy[3]);
    let hour = mdy[4] ? Number(mdy[4]) : 12;
    const minute = mdy[5] ? Number(mdy[5]) : 0;
    const ampm = mdy[6]?.toUpperCase();
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    const iso = new Date(Date.UTC(year, month - 1, day, hour, minute, 0)).toISOString();
    return iso;
  }
  const ymd = /(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (ymd) {
    return new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12, 0, 0)).toISOString();
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

  let fasting: boolean | null = parseFasting(fastingRaw);

  const fieldConfidence: Record<string, number> = {};
  const collectedAt = collectedRaw ? parseQuestDateTime(collectedRaw) : null;
  const receivedAt = receivedRaw ? parseQuestDateTime(receivedRaw) : null;
  const reportedAt = reportedRaw ? parseQuestDateTime(reportedRaw) : null;
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
