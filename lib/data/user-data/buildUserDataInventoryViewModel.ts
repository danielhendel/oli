/**
 * User-facing inventory view model (Phase 3B).
 * Composes registries + profile graph — no collection names, no raw health values.
 * Pure — no React, no Firebase I/O.
 */

import { buildProfileCompleteness, type ProfileCompletenessSummary } from "./buildProfileCompleteness";
import {
  buildUserProfileGraph,
  type BuildUserProfileGraphInput,
  type UserProfileGraph,
} from "./buildUserProfileGraph";

export type InventoryStatusChip =
  | "Available"
  | "Connected"
  | "Not connected"
  | "Needs attention"
  | "Previously connected"
  | "Connection unavailable"
  | "Needs reconnection"
  | "Not set up"
  | "Coming soon"
  | "Stored, not structured"
  | "No records";

export type InventorySectionRow = {
  id: string;
  title: string;
  statusChip: InventoryStatusChip;
  summary: string;
};

export type UserDataInventoryViewModel = {
  graph: UserProfileGraph;
  completeness: ProfileCompletenessSummary;
  profileRows: readonly InventorySectionRow[];
  sourceRows: readonly InventorySectionRow[];
  recordRows: readonly InventorySectionRow[];
  controlRows: readonly InventorySectionRow[];
  /** Honest privacy copy inputs. */
  privacy: {
    exportAvailable: boolean;
    exportCoverageComplete: boolean;
    deleteAvailable: boolean;
    deleteCoverageComplete: boolean;
    exportGapCount: number;
    deleteGapCount: number;
  };
};

export type BuildUserDataInventoryViewModelInput = BuildUserProfileGraphInput;

function chipFromLabel(label: string | undefined, fallback: InventoryStatusChip): InventoryStatusChip {
  switch (label) {
    case "Available":
    case "Connected":
    case "Not connected":
    case "Needs attention":
    case "Previously connected":
    case "Connection unavailable":
    case "Needs reconnection":
    case "Not set up":
    case "Coming soon":
    case "Stored, not structured":
    case "No records":
      return label;
    case "Not set up yet":
      return "Not set up";
    default:
      return fallback;
  }
}

export function buildUserDataInventoryViewModel(
  input: BuildUserDataInventoryViewModelInput,
): UserDataInventoryViewModel {
  const graph = buildUserProfileGraph({
    ...input,
    labsStructuredExtractionAvailable: input.labsStructuredExtractionAvailable ?? false,
  });
  const completeness = buildProfileCompleteness(graph);

  const profileRows: InventorySectionRow[] = [
    {
      id: "core_profile",
      title: "Core profile",
      statusChip: completeness.sections.find((s) => s.sectionId === "core_profile")?.complete
        ? "Available"
        : "Needs attention",
      summary: "Identity and demographics Oli can use for baselines",
    },
    {
      id: "preferences",
      title: "Preferences",
      statusChip: graph.facts.find((f) => f.factId === "preferred_units_present")?.valueAvailability ===
      "available"
        ? "Available"
        : "Needs attention",
      summary: "Units and preference settings",
    },
    {
      id: "goals",
      title: "Goals",
      statusChip: "Available",
      summary: "Goal fields stored on your profile when set",
    },
  ];

  const sourceRows: InventorySectionRow[] = graph.sources.map((s) => ({
    id: s.sourceId,
    title: s.displayName,
    statusChip: chipFromLabel(s.statusLabel, "Needs attention"),
    summary:
      s.sourceId === "withings"
        ? graph.withings.summary
        : s.issues[0]?.summary ?? `${s.displayName} connection status`,
  }));

  const recordRows: InventorySectionRow[] = graph.records.map((r) => ({
    id: r.domainId,
    title: r.displayName,
    statusChip: chipFromLabel(r.statusLabel, "Needs attention"),
    summary:
      r.recordState === "not_implemented"
        ? "This record system is not implemented yet."
        : r.recordState === "stored_not_structured"
          ? "This report is stored, but structured extraction is not available yet."
          : r.recordState === "no_records"
            ? "No records added yet."
            : r.statusLabel,
  }));

  const controlRows: InventorySectionRow[] = [
    {
      id: "export",
      title: "Export",
      statusChip: graph.exportCoverageComplete ? "Available" : "Needs attention",
      summary: graph.exportCoverageComplete
        ? "Account export is available for covered stores."
        : `Export is available, but ${graph.exportGapCount} required data areas are not fully covered yet.`,
    },
    {
      id: "delete",
      title: "Delete account",
      statusChip: graph.deleteCoverageComplete ? "Available" : "Needs attention",
      summary: graph.deleteCoverageComplete
        ? "Account deletion covers all required stores."
        : `Account deletion is available, but ${graph.deleteGapCount} required data areas are not fully covered yet.`,
    },
    {
      id: "sources",
      title: "Source management",
      statusChip: "Available",
      summary: "Manage connected devices under Settings → Devices",
    },
  ];

  return {
    graph,
    completeness,
    profileRows,
    sourceRows,
    recordRows,
    controlRows,
    privacy: {
      exportAvailable: true,
      exportCoverageComplete: graph.exportCoverageComplete,
      deleteAvailable: true,
      deleteCoverageComplete: graph.deleteCoverageComplete,
      exportGapCount: graph.exportGapCount,
      deleteGapCount: graph.deleteGapCount,
    },
  };
}
