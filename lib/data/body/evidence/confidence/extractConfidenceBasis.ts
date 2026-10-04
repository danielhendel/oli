/**
 * Pure factual confidence-basis extraction.
 *
 * Reads Resolver classifications + bundle observation metadata.
 * Never inspects physiological favorability.
 * Never converts counts into quality points.
 */

import type {
  BodyCompositionConfidenceBasis,
  BodyCompositionConfidenceCalculatedProvenanceState,
  BodyCompositionConfidenceIndependenceState,
  BodyCompositionConfidenceProtocolState,
  BodyCompositionConstructId,
  BodyCompositionEvidenceBundle,
  BodyCompositionEvidenceObservation,
  BodyCompositionEvidenceType,
  BodyCompositionMeasurementMethod,
  BodyCompositionResolverConstructResult,
  BodyCompositionResolverMethodFamily,
  BodyCompositionSourceSystem,
  BodyCompositionWaistProtocolId,
} from "@oli/contracts";
import { bodyCompositionMethodToFamily } from "@oli/contracts";

import { hasStandardizedWhtrProvenance } from "../resolver/formulaProvenance";

function uniqueSorted<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function dedupeRefs(refs: readonly string[]): string[] {
  return uniqueSorted(refs.filter((r) => r.length > 0));
}

function observationsForRefs(
  bundle: BodyCompositionEvidenceBundle,
  refs: readonly string[],
): BodyCompositionEvidenceObservation[] {
  const byId = new Map(bundle.observations.map((o) => [o.observationId, o]));
  const out: BodyCompositionEvidenceObservation[] = [];
  for (const id of dedupeRefs(refs)) {
    const obs = byId.get(id);
    if (obs) out.push(obs);
  }
  return out;
}

function protocolStateFor(
  constructId: BodyCompositionConstructId,
  selected: readonly BodyCompositionEvidenceObservation[],
  bundle: BodyCompositionEvidenceBundle,
): BodyCompositionConfidenceProtocolState {
  const protocols = selected
    .map((o) => o.provenance.protocolId ?? null)
    .filter((p): p is BodyCompositionWaistProtocolId => p != null);

  if (constructId === "H1") {
    const whtr = selected.find((o) => o.metricKey === "whtr");
    if (whtr && hasStandardizedWhtrProvenance(whtr, bundle)) {
      return "known_governed";
    }
    if (protocols.includes("who_midpoint_v1")) return "known_governed";
    if (protocols.includes("unknown")) return "unknown";
    if (selected.some((o) => o.metricKey === "waist_circumference" || o.metricKey === "whtr")) {
      return "missing";
    }
    return "not_applicable";
  }

  if (protocols.includes("who_midpoint_v1")) return "known_governed";
  if (protocols.includes("unknown")) return "unknown";
  if (protocols.length === 0) return "not_applicable";
  return "unsupported";
}

function calculatedProvenanceState(
  selected: readonly BodyCompositionEvidenceObservation[],
): BodyCompositionConfidenceCalculatedProvenanceState {
  const calculated = selected.filter((o) => o.evidenceType === "calculated");
  if (calculated.length === 0) return "not_applicable";
  const allComplete = calculated.every(
    (o) =>
      typeof o.provenance.formulaVersion === "string" &&
      o.provenance.formulaVersion.length > 0 &&
      Array.isArray(o.provenance.inputObservationRefs) &&
      o.provenance.inputObservationRefs.length > 0,
  );
  return allComplete ? "complete" : "unavailable";
}

function independenceState(
  selected: readonly BodyCompositionEvidenceObservation[],
): BodyCompositionConfidenceIndependenceState {
  if (selected.length === 0) return "not_applicable";
  if (selected.length === 1) return "single_observation";
  // Evidence model cannot reliably prove independent source events.
  return "independence_unknown";
}

function constructFactsFor(
  constructId: BodyCompositionConstructId,
  construct: BodyCompositionResolverConstructResult,
  selected: readonly BodyCompositionEvidenceObservation[],
): string[] {
  const metrics = new Set(selected.map((o) => o.metricKey));
  const channelIds = new Set(construct.channels.map((c) => c.channelId));
  const facts: string[] = [];

  switch (constructId) {
    case "H1":
      if (metrics.has("whtr")) facts.push("standardized_whtr_channel_present");
      if (selected.some((o) => o.provenance.protocolId === "who_midpoint_v1")) {
        facts.push("governed_who_waist_protocol");
      }
      if (selected.some((o) => o.metricKey === "whtr" && o.evidenceType === "calculated")) {
        facts.push("governed_height_provenance_candidate");
      }
      if (metrics.has("visceral_fat_mass") || channelIds.has("vat_mass")) {
        facts.push("vat_mass_channel_present");
      }
      if (metrics.has("visceral_fat_volume") || channelIds.has("vat_volume")) {
        facts.push("vat_volume_channel_present");
      }
      if (construct.status === "multiple_valid" || construct.channels.filter((c) => c.status === "resolved" || c.status === "resolved_with_supporting").length > 1) {
        facts.push("multiple_complementary_channels");
      }
      if (
        construct.rationaleCodes.includes("same_day_boundary_not_frozen") ||
        construct.rationaleCodes.includes("same_day_precedence_not_applied")
      ) {
        facts.push("unresolved_day_boundary_policy");
      }
      break;
    case "H2":
      if (metrics.has("fmi")) facts.push("fmi_resolved");
      if (metrics.has("fat_percent")) facts.push("total_bf_percent_resolved");
      if (metrics.has("fat_mass")) facts.push("fat_mass_resolved");
      if (construct.status === "policy_not_frozen" || construct.status === "multiple_valid") {
        facts.push("open_bf_percent_fat_mass_precedence");
      }
      if (selected.some((o) => o.source.measurementMethod === "unknown")) {
        facts.push("unknown_method_present");
      }
      if (selected.some((o) => o.source.measurementMethod !== "unknown")) {
        facts.push("known_method_present");
      }
      if (selected.some((o) => o.metricKey === "fmi" && o.evidenceType === "calculated")) {
        facts.push("exact_fmi_provenance");
      }
      break;
    case "H3":
      if (metrics.has("almi")) facts.push("almi_resolved");
      if (metrics.has("ffmi")) facts.push("ffmi_resolved");
      if (metrics.has("fat_free_mass")) facts.push("ffm_evidence");
      if (metrics.has("lean_mass")) facts.push("total_lean_evidence");
      if (construct.status === "policy_not_frozen" || construct.status === "multiple_valid") {
        facts.push("open_ffm_lean_precedence");
      }
      if (
        selected.some(
          (o) =>
            (o.metricKey === "almi" || o.metricKey === "ffmi") && o.evidenceType === "calculated",
        )
      ) {
        facts.push("exact_calculated_provenance");
      }
      break;
    case "H4":
      if (metrics.has("android_gynoid_ratio")) facts.push("ag_ratio_present");
      if (selected.some((o) => o.metricKey === "fat_percent" && o.region === "android")) {
        facts.push("android_fat_percent_present");
      }
      if (selected.some((o) => o.metricKey === "fat_percent" && o.region === "gynoid")) {
        facts.push("gynoid_fat_percent_present");
      }
      if (construct.channels.length > 1) facts.push("complementary_explanatory_channels");
      break;
    case "P1":
      if (metrics.has("ffmi")) facts.push("ffmi_present");
      if (metrics.has("fat_free_mass")) facts.push("ffm_present");
      if (metrics.has("lean_mass")) facts.push("total_lean_present");
      if (construct.status === "multiple_valid" || construct.status === "policy_not_frozen") {
        facts.push("open_unranked_multiple_channels");
      }
      if (selected.some((o) => o.evidenceType === "calculated")) {
        facts.push("known_calculated_provenance");
      }
      break;
    case "P2":
      if (metrics.has("almi")) facts.push("almi_present");
      if (selected.some((o) => o.region === "right_arm")) facts.push("right_arm_lean_present");
      if (selected.some((o) => o.region === "left_arm")) facts.push("left_arm_lean_present");
      if (selected.some((o) => o.region === "right_leg")) facts.push("right_leg_lean_present");
      if (selected.some((o) => o.region === "left_leg")) facts.push("left_leg_lean_present");
      {
        const limbs = ["right_arm", "left_arm", "right_leg", "left_leg"] as const;
        const covered = limbs.filter((r) => selected.some((o) => o.region === r)).length;
        facts.push(`laterality_coverage_${covered}_of_4`);
      }
      break;
    case "P3":
      if (metrics.has("fmi")) facts.push("fmi_present");
      if (metrics.has("fat_percent")) facts.push("total_bf_percent_present");
      if (metrics.has("fat_mass")) facts.push("fat_mass_present");
      if (construct.status === "policy_not_frozen" || construct.status === "multiple_valid") {
        facts.push("open_fat_mass_tertiary_precedence");
      }
      if (selected.some((o) => o.metricKey === "fmi" && o.evidenceType === "calculated")) {
        facts.push("exact_calculated_provenance");
      }
      break;
    default: {
      const _exhaustive: never = constructId;
      return _exhaustive;
    }
  }

  return uniqueSorted(facts);
}

/**
 * Extract factual confidence basis for one construct.
 * Physiological values are never read for ranking.
 */
export function extractConfidenceBasis(args: {
  construct: BodyCompositionResolverConstructResult;
  bundle: BodyCompositionEvidenceBundle;
}): BodyCompositionConfidenceBasis {
  const { construct, bundle } = args;
  const selectedRefs = dedupeRefs([
    ...construct.primaryEvidenceRefs,
    ...construct.supportingEvidenceRefs,
    ...construct.alternateEvidenceRefs,
  ]);
  const selected = observationsForRefs(bundle, selectedRefs);

  const sourceSystems = uniqueSorted(
    selected.map((o) => o.source.sourceSystem),
  ) as BodyCompositionSourceSystem[];
  const methods = uniqueSorted(
    selected.map((o) => o.source.measurementMethod),
  ) as BodyCompositionMeasurementMethod[];
  const methodFamilies = uniqueSorted(
    selected.map((o) =>
      bodyCompositionMethodToFamily(o.source.measurementMethod, o.evidenceType),
    ),
  ) as BodyCompositionResolverMethodFamily[];
  const metrics = uniqueSorted(selected.map((o) => o.metricKey));
  const evidenceTypes = uniqueSorted(
    selected.map((o) => o.evidenceType),
  ) as BodyCompositionEvidenceType[];
  const protocolIds = uniqueSorted(
    selected
      .map((o) => o.provenance.protocolId)
      .filter((p): p is BodyCompositionWaistProtocolId => p != null),
  );

  const complementaryChannelCount = construct.channels.filter(
    (c) =>
      c.status === "resolved" ||
      c.status === "resolved_with_supporting" ||
      c.status === "multiple_valid",
  ).length;

  const verifiedSourcePresent = selected.some(
    (o) => o.source.sourceSystem === "body_scan" && o.sourceReported === true,
  );
  const measuredEvidencePresent = evidenceTypes.includes("measured");
  const estimatedEvidencePresent = evidenceTypes.includes("estimated");
  const calculatedEvidencePresent = evidenceTypes.includes("calculated");
  const unknownMethodPresent = methods.includes("unknown");
  const knownMethodPresent = methods.some((m) => m !== "unknown");

  const datedEvidencePresent = selected.some((o) => o.measuredAt.trim().length > 0);
  const undatedEvidencePresent =
    construct.status === "undated_only" ||
    construct.recencyMetadata.undatedCandidateCount > 0;

  return {
    constructId: construct.constructId,
    factualDimensions: {
      resolverStatus: construct.status,
      evidenceCompletenessMode: "caller_supplied_partial",
      primaryRefCount: dedupeRefs(construct.primaryEvidenceRefs).length,
      supportingRefCount: dedupeRefs(construct.supportingEvidenceRefs).length,
      alternateRefCount: dedupeRefs(construct.alternateEvidenceRefs).length,
      exclusionCount: construct.excludedCandidateSummaries.length,
      distinctSourceSystemCount: sourceSystems.length,
      distinctMethodFamilyCount: methodFamilies.length,
      channelCount: construct.channels.length,
      complementaryChannelCount,
      verifiedSourcePresent,
      measuredEvidencePresent,
      estimatedEvidencePresent,
      calculatedEvidencePresent,
      unknownMethodPresent,
      knownMethodPresent,
      protocolState: protocolStateFor(construct.constructId, selected, bundle),
      calculatedProvenanceState: calculatedProvenanceState(selected),
      datedEvidencePresent,
      undatedEvidencePresent,
      ageDays: construct.recencyMetadata.primaryAgeDays,
      recencyClass: construct.recencyMetadata.primaryRecencyClass,
      recencyPolicyState: construct.recencyMetadata.recencyPolicyState,
      conflictState: construct.status === "conflict",
      policyNotFrozenState:
        construct.status === "policy_not_frozen" ||
        construct.rationaleCodes.includes("policy_not_frozen") ||
        construct.rationaleCodes.includes("unfrozen_channel_precedence") ||
        construct.rationaleCodes.includes("same_day_boundary_not_frozen"),
      independenceState: independenceState(selected),
      sourceSystemsPresent: sourceSystems,
      methodFamiliesPresent: methodFamilies,
      measurementMethodsPresent: methods,
      metricsPresent: metrics,
      evidenceTypesPresent: evidenceTypes,
      protocolIdsPresent: protocolIds,
    },
    constructFacts: constructFactsFor(construct.constructId, construct, selected),
  };
}
