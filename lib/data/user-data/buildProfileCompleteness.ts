/**
 * Truthful section-level profile completeness (Phase 3B).
 * No vanity overall score. Placeholders never count as complete.
 * Pure — no React, no Firebase I/O.
 */

import type { UserProfileFact, UserProfileGraph } from "./buildUserProfileGraph";
import type { UserDataFieldIssue } from "./userDataFieldStatus";

export type CompletenessSectionId =
  | "core_profile"
  | "health_history"
  | "device_sources"
  | "records"
  | "privacy_controls"
  | "analytics_readiness";

export type CompletenessSection = {
  sectionId: CompletenessSectionId;
  displayName: string;
  requiredFieldCount: number;
  presentFieldCount: number;
  missingCount: number;
  conflictingCount: number;
  placeholderCount: number;
  staleCount: number;
  primaryGaps: readonly string[];
  /** Section is complete only when present === required and no placeholder/conflict/stale blockers. */
  complete: boolean;
};

export type ProfileCompletenessSummary = {
  sections: readonly CompletenessSection[];
};

const CORE_FACTS = [
  "auth_uid_present",
  "date_of_birth_present",
  "sex_at_birth_present",
  "height_present",
  "preferred_units_present",
] as const;

const HEALTH_HISTORY_FACTS = [
  "medical_history_persistence",
  "medications_persistence",
  "supplements_persistence",
] as const;

const DEVICE_FACTS = ["oura_connected", "apple_health_connected", "withings_connection"] as const;

const RECORD_FACTS = [
  "lab_upload_count_category",
  "scans_persistence",
  "dna_persistence",
] as const;

const PRIVACY_FACTS = ["export_coverage", "delete_coverage"] as const;

const ANALYTICS_FACTS = [
  "oura_connected",
  "apple_health_connected",
  "lab_upload_count_category",
  "body_weight_source_state",
] as const;

function countIssues(facts: readonly UserProfileFact[], status: UserDataFieldIssue["status"]): number {
  return facts.reduce((n, f) => n + f.issues.filter((i) => i.status === status).length, 0);
}

function isPresent(fact: UserProfileFact | undefined): boolean {
  if (!fact) return false;
  if (fact.issues.some((i) => i.status === "placeholder")) return false;
  return fact.valueAvailability === "available";
}

function sectionFromFacts(
  sectionId: CompletenessSectionId,
  displayName: string,
  factIds: readonly string[],
  graph: UserProfileGraph,
  opts?: { treatOrphanedAsNonPresent?: boolean },
): CompletenessSection {
  const facts = factIds
    .map((id) => graph.facts.find((f) => f.factId === id))
    .filter((f): f is UserProfileFact => f != null);

  const requiredFieldCount = factIds.length;
  let presentFieldCount = 0;
  const primaryGaps: string[] = [];

  for (const f of facts) {
    const blockedByPlaceholder = f.issues.some((i) => i.status === "placeholder");
    const blockedByOrphan =
      opts?.treatOrphanedAsNonPresent === true && f.issues.some((i) => i.status === "orphaned");
    if (isPresent(f) && !blockedByPlaceholder && !blockedByOrphan) {
      presentFieldCount += 1;
    } else {
      const gap =
        f.issues.find((i) => i.status === "placeholder")?.summary ??
        f.issues.find((i) => i.status === "orphaned")?.summary ??
        f.issues.find((i) => i.status === "missing")?.summary ??
        f.provenanceSummary;
      primaryGaps.push(gap);
    }
  }

  const missingCount = facts.filter((f) => f.issues.some((i) => i.status === "missing")).length;
  const conflictingCount = countIssues(facts, "conflicting");
  const placeholderCount = facts.filter((f) => f.issues.some((i) => i.status === "placeholder")).length;
  const staleCount = facts.filter(
    (f) => f.staleStatus === "stale" || f.issues.some((i) => i.status === "stale"),
  ).length;

  const complete =
    presentFieldCount === requiredFieldCount &&
    placeholderCount === 0 &&
    conflictingCount === 0 &&
    staleCount === 0;

  return {
    sectionId,
    displayName,
    requiredFieldCount,
    presentFieldCount,
    missingCount,
    conflictingCount,
    placeholderCount,
    staleCount,
    primaryGaps,
    complete,
  };
}

export function buildProfileCompleteness(graph: UserProfileGraph): ProfileCompletenessSummary {
  const sections: CompletenessSection[] = [
    sectionFromFacts("core_profile", "Core profile", CORE_FACTS, graph),
    sectionFromFacts("health_history", "Health history", HEALTH_HISTORY_FACTS, graph),
    sectionFromFacts("device_sources", "Device / source", DEVICE_FACTS, graph, {
      treatOrphanedAsNonPresent: true,
    }),
    sectionFromFacts("records", "Records", RECORD_FACTS, graph),
    sectionFromFacts("privacy_controls", "Privacy / control", PRIVACY_FACTS, graph),
    sectionFromFacts("analytics_readiness", "Analytics readiness", ANALYTICS_FACTS, graph, {
      treatOrphanedAsNonPresent: true,
    }),
  ];

  return { sections };
}
