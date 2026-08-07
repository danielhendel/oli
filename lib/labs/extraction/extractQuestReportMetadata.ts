/**
 * Quest text metadata extraction (Phase 3D-A).
 * Never emits patient identifiers into candidates.
 */

import type { LabReportMetadataCandidate } from "@oli/contracts";

import {
  labSourceTimestampToCollectedAtIso,
  parseLabSourceTimestampFromQuestRaw,
} from "../history/labSourceTimestamp";

function fieldAfter(label: RegExp, lines: string[]): string | null {
  for (const line of lines) {
    if (!label.test(line)) continue;
    const parts = line.split(/:\s*/);
    if (parts.length >= 2) return parts.slice(1).join(":").trim() || null;
  }
  return null;
}

const DOB_LABEL_RE = /(?:^|\||\s)(?:dob|date\s+of\s+birth)\s*:/i;

/** Reject date substrings that belong to DOB / Date of Birth, not collection. */
function isDobAnchoredDateSubstring(line: string, dateMatchIndex: number): boolean {
  const before = line.slice(0, dateMatchIndex);
  const dobLabel = /(?:^|\||\s)(?:dob|date\s+of\s+birth)\s*:\s*/gi;
  let lastDob: RegExpExecArray | null = null;
  for (;;) {
    const m = dobLabel.exec(before);
    if (!m) break;
    lastDob = m;
  }
  if (!lastDob) return false;
  const afterDob = before.slice(lastDob.index + lastDob[0].length);
  // Date immediately after DOB label (before next field delimiter).
  return !/\||(?:collected|received|reported|fasting|specimen|sex)\s*:/i.test(afterDob);
}

/**
 * Extract collection date raw text without confusing DOB on combined metadata lines.
 * Prefers explicit "Collected Date:" then standalone "Collected:".
 */
export function extractCollectedDateRaw(lines: string[]): string | null {
  for (const line of lines) {
    const collectedDateRe = /collected\s+date\s*:\s*([^|]+?)(?:\s*\||$)/gi;
    let m: RegExpExecArray | null;
    while ((m = collectedDateRe.exec(line)) !== null) {
      const raw = m[1]!.trim();
      if (raw && !isDobAnchoredDateSubstring(line, m.index)) return raw;
    }

    const collectedRe = /(?:^|\|)\s*collected\s*:\s*([^|]+?)(?:\s*\||$)/gi;
    while ((m = collectedRe.exec(line)) !== null) {
      const labelStart = m[0].toLowerCase().indexOf("collected");
      const absLabel = m.index + Math.max(0, labelStart);
      if (/collected\s+date/i.test(line.slice(absLabel, absLabel + 20))) continue;
      const raw = m[1]!.trim();
      if (raw && !isDobAnchoredDateSubstring(line, m.index)) return raw;
    }

    if (/^collected\s*:/i.test(line.trim()) && !DOB_LABEL_RE.test(line)) {
      const after = fieldAfter(/^collected\s*:/i, [line]);
      if (after && !isDobAnchoredDateSubstring(line, line.toLowerCase().indexOf(after.toLowerCase()))) {
        return after;
      }
    }
  }
  return null;
}

/** Join pdfjs-split metadata labels (e.g. "Collected:" on one line, date on the next). */
function expandSplitMetadataLines(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i]!.trim();
    if (
      /^(collected|received|reported|fasting|specimen|report\s+status):$/i.test(cur) &&
      i + 1 < lines.length
    ) {
      const next = lines[i + 1]!.trim();
      if (next && !/^(collected|received|reported|fasting|specimen|report\s+status):/i.test(next)) {
        out.push(`${cur} ${next}`);
        i += 1;
        continue;
      }
    }
    out.push(cur);
  }
  return out;
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
  const lines = expandSplitMetadataLines(args.metadataLines);
  const collectedRaw = extractCollectedDateRaw(lines);
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
  const collectedAtSource = collectedRaw ? parseLabSourceTimestampFromQuestRaw(collectedRaw) : null;
  const receivedAtSource = receivedRaw ? parseLabSourceTimestampFromQuestRaw(receivedRaw) : null;
  const reportedAtSource = reportedRaw ? parseLabSourceTimestampFromQuestRaw(reportedRaw) : null;
  const collectedAt = labSourceTimestampToCollectedAtIso(collectedAtSource);
  const receivedAt = labSourceTimestampToCollectedAtIso(receivedAtSource);
  const reportedAt = labSourceTimestampToCollectedAtIso(reportedAtSource);
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
    collectedAtPrecision: collectedAtSource?.precision ?? null,
    collectedAtSource: collectedAtSource ?? undefined,
    receivedAtSource: receivedAtSource ?? undefined,
    reportedAtSource: reportedAtSource ?? undefined,
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
