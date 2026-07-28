/**
 * Provenance-first user profile graph (Phase 3B).
 * Metadata only — never embed raw health values.
 * Pure — no React, no Firebase I/O.
 */

import type { UserDataDomainId } from "./userDataDomainRegistry";
import { USER_DATA_DOMAIN_REGISTRY, isPlaceholderDomain } from "./userDataDomainRegistry";
import type { UserDataFieldIssue, UserDataFieldStatus } from "./userDataFieldStatus";
import type { UserDataSourceId } from "./userDataSourceRegistry";
import { USER_DATA_SOURCE_REGISTRY } from "./userDataSourceRegistry";
import {
  isExportDeletionCoverageComplete,
  listDeleteCoverageGaps,
  listExportCoverageGaps,
} from "./userDataRetentionRegistry";
import {
  resolveWithingsConnectionTruth,
  type WithingsConnectionTruth,
} from "./withingsConnectionTruth";

export type UserFactAvailability = "available" | "unavailable" | "unknown";

export type UserFactConfidence = "high" | "medium" | "low" | "none";

export type UserProfileFactId =
  | "auth_uid_present"
  | "date_of_birth_present"
  | "sex_at_birth_present"
  | "height_present"
  | "preferred_units_present"
  | "timezone_present"
  | "oura_connected"
  | "apple_health_connected"
  | "withings_connection"
  | "oura_last_sync_known"
  | "body_weight_source_state"
  | "lab_upload_count_category"
  | "medications_persistence"
  | "supplements_persistence"
  | "medical_history_persistence"
  | "scans_persistence"
  | "dna_persistence"
  | "export_coverage"
  | "delete_coverage";

export type UserProfileFact = {
  factId: UserProfileFactId;
  domain: UserDataDomainId;
  /** Presence only — never a raw health value. */
  valueAvailability: UserFactAvailability;
  source: UserDataSourceId;
  sourceRecordType: string;
  sourceTimestamp: string | null;
  attributionDate: string | null;
  lastUpdated: string | null;
  confidence: UserFactConfidence;
  normalizedStatus: "normalized" | "not_normalized" | "n_a";
  displayedStatus: "displayed" | "not_displayed" | "n_a";
  exportStatus: "exportable" | "not_exported" | "n_a";
  deletionStatus: "deletable" | "not_deletable" | "n_a";
  conflictStatus: "ok" | "conflicting";
  staleStatus: "fresh" | "stale" | "unknown";
  issues: readonly UserDataFieldIssue[];
  provenanceSummary: string;
  /** Optional non-health categorical label for UI (e.g. "Previously connected"). */
  statusLabel?: string;
};

export type UserProfileSourceSummary = {
  sourceId: UserDataSourceId;
  displayName: string;
  supportStatus: string;
  currentProductTruth: boolean;
  orphaned: boolean;
  placeholder: boolean;
  statusLabel: string;
  issues: readonly UserDataFieldIssue[];
};

export type UserProfileRecordSummary = {
  domainId: UserDataDomainId;
  displayName: string;
  recordState:
    | "available"
    | "no_records"
    | "not_implemented"
    | "stored_not_structured"
    | "needs_attention";
  statusLabel: string;
};

export type UserProfileGraph = {
  facts: readonly UserProfileFact[];
  sources: readonly UserProfileSourceSummary[];
  records: readonly UserProfileRecordSummary[];
  issues: readonly UserDataFieldIssue[];
  withings: WithingsConnectionTruth;
  exportCoverageComplete: boolean;
  deleteCoverageComplete: boolean;
  exportGapCount: number;
  deleteGapCount: number;
};

export type BuildUserProfileGraphInput = {
  /** Auth session present for the requesting user only. */
  authPresent: boolean;
  profileGeneralPresent?: boolean;
  dateOfBirthPresent?: boolean;
  sexAtBirthPresent?: boolean;
  heightPresent?: boolean;
  preferredUnitsPresent?: boolean;
  timezonePresent?: boolean;
  ouraConnected?: boolean | null;
  appleHealthConnected?: boolean | null;
  ouraLastSyncKnown?: boolean | null;
  /** Categorical only: "none" | "some" | "unknown" — never numeric health values. */
  labUploadCountCategory?: "none" | "some" | "unknown";
  labsStructuredExtractionAvailable?: boolean;
  withingsFirestoreConnectedFlag?: boolean | null;
  withingsHasHistoricalRawEvents?: boolean | null;
  /** ISO timestamps for provenance only when proven. */
  nowIso?: string;
};

function issue(
  status: Exclude<UserDataFieldStatus, "present">,
  summary: string,
): UserDataFieldIssue {
  return { status, summary };
}

function fact(partial: UserProfileFact): UserProfileFact {
  return partial;
}

export function buildUserProfileGraph(input: BuildUserProfileGraphInput): UserProfileGraph {
  const now = input.nowIso ?? null;
  const withings = resolveWithingsConnectionTruth({
    ...(input.withingsFirestoreConnectedFlag !== undefined
      ? { firestoreConnectedFlag: input.withingsFirestoreConnectedFlag }
      : {}),
    ...(input.withingsHasHistoricalRawEvents !== undefined
      ? { hasHistoricalRawEvents: input.withingsHasHistoricalRawEvents }
      : {}),
    liveSyncSupported: false,
  });

  const exportGaps = listExportCoverageGaps();
  const deleteGaps = listDeleteCoverageGaps();
  const coverageComplete = isExportDeletionCoverageComplete();

  const facts: UserProfileFact[] = [
    fact({
      factId: "auth_uid_present",
      domain: "identity",
      valueAvailability: input.authPresent ? "available" : "unavailable",
      source: "firebase_auth",
      sourceRecordType: "auth_session",
      sourceTimestamp: now,
      attributionDate: null,
      lastUpdated: now,
      confidence: input.authPresent ? "high" : "none",
      normalizedStatus: "normalized",
      displayedStatus: "displayed",
      exportStatus: "not_exported",
      deletionStatus: "deletable",
      conflictStatus: "ok",
      staleStatus: "fresh",
      issues: input.authPresent ? [] : [issue("missing", "No authenticated session")],
      provenanceSummary: "Firebase Auth session metadata only",
    }),
    fact({
      factId: "date_of_birth_present",
      domain: "demographics",
      valueAvailability: input.dateOfBirthPresent ? "available" : "unavailable",
      source: "profile_main",
      sourceRecordType: "profile_main",
      sourceTimestamp: now,
      attributionDate: null,
      lastUpdated: now,
      confidence: input.dateOfBirthPresent ? "medium" : "none",
      normalizedStatus: "normalized",
      displayedStatus: "displayed",
      exportStatus: "exportable",
      deletionStatus: "deletable",
      conflictStatus: "ok",
      staleStatus: "unknown",
      issues: input.dateOfBirthPresent ? [] : [issue("missing", "Date of birth not set")],
      provenanceSummary: "Presence from profile/main — value not exposed in inventory",
    }),
    fact({
      factId: "sex_at_birth_present",
      domain: "demographics",
      valueAvailability: input.sexAtBirthPresent ? "available" : "unavailable",
      source: "profile_main",
      sourceRecordType: "profile_main",
      sourceTimestamp: now,
      attributionDate: null,
      lastUpdated: now,
      confidence: input.sexAtBirthPresent ? "medium" : "none",
      normalizedStatus: "normalized",
      displayedStatus: "displayed",
      exportStatus: "exportable",
      deletionStatus: "deletable",
      conflictStatus: "ok",
      staleStatus: "unknown",
      issues: input.sexAtBirthPresent ? [] : [issue("missing", "Sex at birth not set")],
      provenanceSummary: "Presence from profile/main — value not exposed in inventory",
    }),
    fact({
      factId: "height_present",
      domain: "demographics",
      valueAvailability: input.heightPresent ? "available" : "unavailable",
      source: "profile_main",
      sourceRecordType: "profile_main",
      sourceTimestamp: now,
      attributionDate: null,
      lastUpdated: now,
      confidence: input.heightPresent ? "medium" : "none",
      normalizedStatus: "normalized",
      displayedStatus: "displayed",
      exportStatus: "exportable",
      deletionStatus: "deletable",
      conflictStatus: "ok",
      staleStatus: "unknown",
      issues: input.heightPresent ? [] : [issue("missing", "Height not set")],
      provenanceSummary: "Presence from profile/main — value not exposed in inventory",
    }),
    fact({
      factId: "preferred_units_present",
      domain: "preferences",
      valueAvailability: input.preferredUnitsPresent ? "available" : "unavailable",
      source: "preferences",
      sourceRecordType: "preferences",
      sourceTimestamp: now,
      attributionDate: null,
      lastUpdated: now,
      confidence: input.preferredUnitsPresent ? "high" : "none",
      normalizedStatus: "normalized",
      displayedStatus: "displayed",
      exportStatus: "not_exported",
      deletionStatus: "deletable",
      conflictStatus: "ok",
      staleStatus: "fresh",
      issues: input.preferredUnitsPresent
        ? [issue("not_exported", "Preferences not in export allowlist")]
        : [issue("missing", "Preferred units not set")],
      provenanceSummary: "Presence from user preferences field",
    }),
    fact({
      factId: "timezone_present",
      domain: "preferences",
      valueAvailability: input.timezonePresent ? "available" : "unavailable",
      source: "preferences",
      sourceRecordType: "preferences",
      sourceTimestamp: now,
      attributionDate: null,
      lastUpdated: now,
      confidence: input.timezonePresent ? "high" : "none",
      normalizedStatus: "normalized",
      displayedStatus: "displayed",
      exportStatus: "not_exported",
      deletionStatus: "deletable",
      conflictStatus: "ok",
      staleStatus: "fresh",
      issues: input.timezonePresent ? [] : [issue("missing", "Timezone not set")],
      provenanceSummary: "Presence from user preferences field",
    }),
    fact({
      factId: "oura_connected",
      domain: "devices",
      valueAvailability:
        input.ouraConnected == null ? "unknown" : input.ouraConnected ? "available" : "unavailable",
      source: "oura",
      sourceRecordType: "integration_status",
      sourceTimestamp: now,
      attributionDate: null,
      lastUpdated: now,
      confidence: input.ouraConnected == null ? "low" : "high",
      normalizedStatus: "normalized",
      displayedStatus: "displayed",
      exportStatus: "not_exported",
      deletionStatus: "not_deletable",
      conflictStatus: "ok",
      staleStatus: "unknown",
      issues: [
        ...(input.ouraConnected ? [] : [issue("missing", "Oura not connected")]),
        issue("not_exported", "Integration docs not in export allowlist"),
        issue("not_deletable", "Integration docs not in delete allowlist"),
      ],
      provenanceSummary: "Operational Oura connection status",
      statusLabel: input.ouraConnected ? "Connected" : "Not connected",
    }),
    fact({
      factId: "apple_health_connected",
      domain: "devices",
      valueAvailability:
        input.appleHealthConnected == null
          ? "unknown"
          : input.appleHealthConnected
            ? "available"
            : "unavailable",
      source: "apple_health",
      sourceRecordType: "integration_status",
      sourceTimestamp: now,
      attributionDate: null,
      lastUpdated: now,
      confidence: input.appleHealthConnected == null ? "low" : "high",
      normalizedStatus: "normalized",
      displayedStatus: "displayed",
      exportStatus: "exportable",
      deletionStatus: "deletable",
      conflictStatus: "ok",
      staleStatus: "unknown",
      issues: input.appleHealthConnected ? [] : [issue("missing", "Apple Health not connected")],
      provenanceSummary: "Operational Apple Health connection status",
      statusLabel: input.appleHealthConnected ? "Connected" : "Not connected",
    }),
    fact({
      factId: "withings_connection",
      domain: "devices",
      valueAvailability: withings.orphaned ? "available" : "unavailable",
      source: "withings",
      sourceRecordType: "legacy_integration",
      sourceTimestamp: now,
      attributionDate: null,
      lastUpdated: now,
      confidence: "low",
      normalizedStatus: "not_normalized",
      displayedStatus: "displayed",
      exportStatus: "exportable",
      deletionStatus: "deletable",
      conflictStatus: "ok",
      staleStatus: "stale",
      issues: [
        issue("orphaned", "Withings live sync is not supported"),
        issue("stale", "No current sync confidence"),
        issue("not_normalized", "Withings rows excluded from current body state"),
      ],
      provenanceSummary: withings.summary,
      statusLabel: withings.label,
    }),
    fact({
      factId: "oura_last_sync_known",
      domain: "devices",
      valueAvailability: input.ouraLastSyncKnown ? "available" : "unavailable",
      source: "oura",
      sourceRecordType: "sync_metadata",
      sourceTimestamp: now,
      attributionDate: null,
      lastUpdated: now,
      confidence: input.ouraLastSyncKnown ? "medium" : "none",
      normalizedStatus: "n_a",
      displayedStatus: "displayed",
      exportStatus: "n_a",
      deletionStatus: "n_a",
      conflictStatus: "ok",
      staleStatus: input.ouraLastSyncKnown ? "fresh" : "unknown",
      issues: input.ouraLastSyncKnown ? [] : [issue("missing", "Last Oura sync not proven")],
      provenanceSummary: "Last sync shown only when proven by integration status",
    }),
    fact({
      factId: "body_weight_source_state",
      domain: "body_composition",
      valueAvailability: "unknown",
      source: "apple_health",
      sourceRecordType: "raw_events_filtered",
      sourceTimestamp: now,
      attributionDate: null,
      lastUpdated: now,
      confidence: "medium",
      normalizedStatus: "normalized",
      displayedStatus: "displayed",
      exportStatus: "exportable",
      deletionStatus: "deletable",
      conflictStatus: "ok",
      staleStatus: "unknown",
      issues: [
        issue("orphaned", "Withings body values excluded from current state"),
      ],
      provenanceSummary: "Current body reads filter to Apple Health only",
    }),
    fact({
      factId: "lab_upload_count_category",
      domain: "labs",
      valueAvailability:
        input.labUploadCountCategory === "some"
          ? "available"
          : input.labUploadCountCategory === "none"
            ? "unavailable"
            : "unknown",
      source: "labs_upload",
      sourceRecordType: "lab_uploads",
      sourceTimestamp: now,
      attributionDate: null,
      lastUpdated: now,
      confidence: input.labUploadCountCategory === "unknown" ? "low" : "high",
      normalizedStatus:
        input.labsStructuredExtractionAvailable === true ? "normalized" : "not_normalized",
      displayedStatus: "displayed",
      exportStatus: "not_exported",
      deletionStatus: "not_deletable",
      conflictStatus: "ok",
      staleStatus: "unknown",
      issues: [
        ...(input.labsStructuredExtractionAvailable
          ? []
          : [
              issue("not_normalized", "Structured lab extraction is not available yet"),
              issue("unsupported", "Lab PDF parser is unsupported"),
            ]),
        issue("not_exported", "Lab uploads not in export allowlist"),
        issue("not_deletable", "Lab uploads not in delete allowlist"),
      ],
      provenanceSummary: "Upload presence category only — no biomarker values",
      statusLabel:
        input.labUploadCountCategory === "some"
          ? input.labsStructuredExtractionAvailable
            ? "Available"
            : "Stored, not structured"
          : input.labUploadCountCategory === "none"
            ? "No records"
            : "Needs attention",
    }),
    ...buildPlaceholderPersistenceFacts(now),
    fact({
      factId: "export_coverage",
      domain: "export",
      valueAvailability: coverageComplete ? "available" : "unavailable",
      source: "firebase_auth",
      sourceRecordType: "retention_registry",
      sourceTimestamp: now,
      attributionDate: null,
      lastUpdated: now,
      confidence: "high",
      normalizedStatus: "n_a",
      displayedStatus: "displayed",
      exportStatus: "n_a",
      deletionStatus: "n_a",
      conflictStatus: "ok",
      staleStatus: "fresh",
      issues:
        exportGaps.length > 0
          ? [issue("not_exported", `${exportGaps.length} required paths lack export coverage`)]
          : [],
      provenanceSummary: "Derived from user data retention registry",
      statusLabel: exportGaps.length === 0 ? "Available" : "Needs attention",
    }),
    fact({
      factId: "delete_coverage",
      domain: "deletion",
      valueAvailability: deleteGaps.length === 0 ? "available" : "unavailable",
      source: "firebase_auth",
      sourceRecordType: "retention_registry",
      sourceTimestamp: now,
      attributionDate: null,
      lastUpdated: now,
      confidence: "high",
      normalizedStatus: "n_a",
      displayedStatus: "displayed",
      exportStatus: "n_a",
      deletionStatus: "n_a",
      conflictStatus: "ok",
      staleStatus: "fresh",
      issues:
        deleteGaps.length > 0
          ? [issue("not_deletable", `${deleteGaps.length} required paths lack delete coverage`)]
          : [],
      provenanceSummary: "Derived from user data retention registry",
      statusLabel: deleteGaps.length === 0 ? "Available" : "Needs attention",
    }),
  ];

  const sources = buildSourceSummaries(input, withings);
  const records = buildRecordSummaries(input);
  const issues = facts.flatMap((f) => f.issues);

  return {
    facts,
    sources,
    records,
    issues,
    withings,
    exportCoverageComplete: exportGaps.length === 0,
    deleteCoverageComplete: deleteGaps.length === 0,
    exportGapCount: exportGaps.length,
    deleteGapCount: deleteGaps.length,
  };
}

function buildPlaceholderPersistenceFacts(now: string | null): UserProfileFact[] {
  const placeholders: {
    factId: UserProfileFactId;
    domain: UserDataDomainId;
    source: UserDataSourceId;
  }[] = [
    { factId: "medications_persistence", domain: "medications", source: "medications" },
    { factId: "supplements_persistence", domain: "supplements", source: "supplements" },
    { factId: "medical_history_persistence", domain: "medical_history", source: "medical_history" },
    { factId: "scans_persistence", domain: "scans", source: "scans_upload" },
    { factId: "dna_persistence", domain: "dna", source: "dna_upload" },
  ];

  return placeholders.map(({ factId, domain, source }) =>
    fact({
      factId,
      domain,
      valueAvailability: "unavailable",
      source,
      sourceRecordType: "unimplemented",
      sourceTimestamp: now,
      attributionDate: null,
      lastUpdated: now,
      confidence: "none",
      normalizedStatus: "n_a",
      displayedStatus: "displayed",
      exportStatus: "n_a",
      deletionStatus: "n_a",
      conflictStatus: "ok",
      staleStatus: "unknown",
      issues: [
        issue("placeholder", "This record system is not implemented yet"),
        issue("unsupported", "No durable persistence"),
      ],
      provenanceSummary: "Placeholder domain — no durable store",
      statusLabel: "Not set up yet",
    }),
  );
}

function buildSourceSummaries(
  input: BuildUserProfileGraphInput,
  withings: WithingsConnectionTruth,
): UserProfileSourceSummary[] {
  const deviceSources: UserDataSourceId[] = [
    "oura",
    "apple_health",
    "withings",
    "manual_strength",
    "manual_cardio",
    "manual_nutrition",
    "manual_body",
  ];

  return deviceSources.map((sourceId) => {
    const def = USER_DATA_SOURCE_REGISTRY[sourceId];
    if (sourceId === "withings") {
      return {
        sourceId,
        displayName: def.displayName,
        supportStatus: def.supportStatus,
        currentProductTruth: false,
        orphaned: withings.orphaned,
        placeholder: false,
        statusLabel: withings.label,
        issues: [
          issue("orphaned", "Live sync unavailable"),
          issue("stale", "No current sync confidence"),
        ],
      };
    }
    if (sourceId === "oura") {
      return {
        sourceId,
        displayName: def.displayName,
        supportStatus: def.supportStatus,
        currentProductTruth: true,
        orphaned: false,
        placeholder: false,
        statusLabel: input.ouraConnected ? "Connected" : "Not connected",
        issues: input.ouraConnected ? [] : [issue("missing", "Oura not connected")],
      };
    }
    if (sourceId === "apple_health") {
      return {
        sourceId,
        displayName: def.displayName,
        supportStatus: def.supportStatus,
        currentProductTruth: true,
        orphaned: false,
        placeholder: false,
        statusLabel: input.appleHealthConnected ? "Connected" : "Not connected",
        issues: input.appleHealthConnected ? [] : [issue("missing", "Apple Health not connected")],
      };
    }
    return {
      sourceId,
      displayName: def.displayName,
      supportStatus: def.supportStatus,
      currentProductTruth: def.currentProductTruth,
      orphaned: false,
      placeholder: false,
      statusLabel: "Available",
      issues: [],
    };
  });
}

function buildRecordSummaries(input: BuildUserProfileGraphInput): UserProfileRecordSummary[] {
  const recordDomains: UserDataDomainId[] = [
    "labs",
    "scans",
    "medical_history",
    "medications",
    "supplements",
    "dna",
  ];

  return recordDomains.map((domainId) => {
    const domain = USER_DATA_DOMAIN_REGISTRY[domainId];
    if (isPlaceholderDomain(domainId) || !domain.structuredPersistenceExists) {
      return {
        domainId,
        displayName: domain.displayName,
        recordState: "not_implemented",
        statusLabel: "Not set up yet",
      };
    }
    if (domainId === "labs") {
      if (input.labUploadCountCategory === "some") {
        return {
          domainId,
          displayName: domain.displayName,
          recordState: input.labsStructuredExtractionAvailable
            ? "available"
            : "stored_not_structured",
          statusLabel: input.labsStructuredExtractionAvailable
            ? "Available"
            : "Stored, not structured",
        };
      }
      if (input.labUploadCountCategory === "none") {
        return {
          domainId,
          displayName: domain.displayName,
          recordState: "no_records",
          statusLabel: "No records",
        };
      }
      return {
        domainId,
        displayName: domain.displayName,
        recordState: "needs_attention",
        statusLabel: "Needs attention",
      };
    }
    return {
      domainId,
      displayName: domain.displayName,
      recordState: "needs_attention",
      statusLabel: "Needs attention",
    };
  });
}
