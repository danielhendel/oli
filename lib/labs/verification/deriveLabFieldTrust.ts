/**
 * Field-level trust derivation for lab candidates (transcription trust only).
 */
import type { LabFieldTrust, LabReportMetadataCandidate, LabResultCandidate } from "@oli/contracts";
import { getLabMetricImportProfile } from "../autoPublish/labMetricImportProfiles";

export function deriveLabFieldTrust(args: {
  report: LabReportMetadataCandidate;
  candidate: LabResultCandidate;
}): LabFieldTrust {
  const c = args.candidate;
  const metricId = c.aliasMatch.canonicalMetricId;
  const profile = metricId ? getLabMetricImportProfile(metricId) : undefined;
  const unitRequired = Boolean(profile && profile.allowedUnits.length > 0);

  const analyteTrusted =
    Boolean(metricId) &&
    !c.aliasMatch.requiresReview &&
    c.aliasMatch.matchMethod !== "unmatched" &&
    c.aliasMatch.confidence >= 0.95;

  const valueTrusted =
    c.result?.kind === "numeric" &&
    Number.isFinite(c.result.value) &&
    !c.warnings.includes("ambiguous_value");

  const unitTrusted =
    !unitRequired ||
    (Boolean(c.unit.known && c.unit.normalizedUnit) && !c.warnings.includes("ambiguous_unit"));

  const collectionDateTrusted = Boolean(args.report.collectedAt);
  const provenanceTrusted = Boolean(
    c.provenance.sourceDocumentId &&
      c.provenance.sourceLocator &&
      c.provenance.sourceChecksumSha256 &&
      c.provenance.parserId &&
      c.provenance.sourcePage >= 1,
  );

  const rangePresent = Boolean(c.rawReferenceRange?.trim() || c.structuredReferenceRange);
  const flagPresent = Boolean(c.flag.rawFlag?.trim());

  return {
    analyte: analyteTrusted ? "trusted" : "unresolved",
    value: valueTrusted ? "trusted" : "unresolved",
    unit: unitTrusted ? "trusted" : "unresolved",
    collectionDate: collectionDateTrusted ? "trusted" : "unresolved",
    referenceRange: rangePresent
      ? c.structuredReferenceRange
        ? "trusted"
        : "unresolved"
      : "not_required",
    sourceFlag: flagPresent ? "trusted" : "not_present",
    panel: c.panelId ? "trusted" : "not_required",
    method: c.method?.assayMethod ? "trusted" : "not_required",
    provenance: provenanceTrusted ? "trusted" : "unresolved",
  };
}

/** Required fields for numeric import eligibility (optional range/flag excluded). */
export function requiredFieldsTrustedForImport(trust: LabFieldTrust): boolean {
  return (
    trust.analyte === "trusted" &&
    trust.value === "trusted" &&
    trust.unit === "trusted" &&
    trust.collectionDate === "trusted" &&
    trust.provenance === "trusted"
  );
}
