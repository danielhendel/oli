/**
 * Versioned Quest panel layout profiles for positional table parsing.
 * Isolated per panel — not one giant regex grammar.
 */

export const LAB_PANEL_PROFILE_VERSION = "1.1.0" as const;

export type LabPanelColumnRegions = {
  analyteLabel: { xMin: number; xMax: number };
  result: { xMin: number; xMax: number };
  flag: { xMin: number; xMax: number };
  unit: { xMin: number; xMax: number };
  referenceRange: { xMin: number; xMax: number };
  historicalResult: { xMin: number; xMax: number };
};

export type LabPanelLayoutProfile = {
  id: string;
  version: typeof LAB_PANEL_PROFILE_VERSION;
  provider: "quest";
  panelKeys: readonly string[];
  rowYTolerance: number;
  columns: LabPanelColumnRegions;
  knownHeaders: readonly string[];
  knownFooters: readonly string[];
  knownPanelLabels: readonly string[];
  knownRiskTables: readonly string[];
  knownMethodNotes: readonly string[];
};

/** Normalized Quest letter-width column bands (0–100 relative x). */
const QUEST_STANDARD_COLUMNS: LabPanelColumnRegions = {
  analyteLabel: { xMin: 0, xMax: 38 },
  result: { xMin: 38, xMax: 52 },
  flag: { xMin: 52, xMax: 58 },
  unit: { xMin: 58, xMax: 72 },
  referenceRange: { xMin: 72, xMax: 100 },
  historicalResult: { xMin: 100, xMax: 100 }, // disabled until page-width calibrated
};

function questProfile(
  id: string,
  panelKeys: readonly string[],
  extras: Partial<Pick<LabPanelLayoutProfile, "knownHeaders" | "knownFooters" | "knownPanelLabels" | "knownRiskTables" | "knownMethodNotes" | "columns">> = {},
): LabPanelLayoutProfile {
  return {
    id,
    version: LAB_PANEL_PROFILE_VERSION,
    provider: "quest",
    panelKeys,
    rowYTolerance: 2.5,
    columns: extras.columns ?? QUEST_STANDARD_COLUMNS,
    knownHeaders: extras.knownHeaders ?? ["TEST NAME", "RESULT", "FLAG", "UNITS", "REFERENCE RANGE"],
    knownFooters: extras.knownFooters ?? ["Performing Site", "QUEST DIAGNOSTICS"],
    knownPanelLabels: extras.knownPanelLabels ?? [],
    knownRiskTables: extras.knownRiskTables ?? [],
    knownMethodNotes: extras.knownMethodNotes ?? [],
  };
}

export const QUEST_PANEL_PROFILES: readonly LabPanelLayoutProfile[] = [
  questProfile("quest_cmp_v1", ["COMPREHENSIVE METABOLIC PANEL", "CMP", "BMP"], {
    knownPanelLabels: ["COMPREHENSIVE METABOLIC PANEL", "Basic Metabolic Panel"],
  }),
  questProfile("quest_cbc_v1", ["CBC", "COMPLETE BLOOD COUNT"], {
    knownPanelLabels: ["CBC (INCLUDES DIFF/PLT)", "COMPLETE BLOOD COUNT"],
  }),
  // Cardio IQ / advanced lipid before generic lipid so "CARDIO IQ LIPID" resolves correctly.
  // Current-result band is left of risk columns; historical is rightmost when present.
  questProfile("quest_cardio_iq_v1", ["CARDIO IQ"], {
    knownPanelLabels: ["CARDIO IQ"],
    knownRiskTables: ["RELATIVE RISK", "OPTIMAL", "MODERATE", "HIGH"],
    columns: {
      analyteLabel: { xMin: 0, xMax: 32 },
      result: { xMin: 32, xMax: 44 },
      flag: { xMin: 44, xMax: 50 },
      unit: { xMin: 50, xMax: 62 },
      referenceRange: { xMin: 62, xMax: 88 },
      historicalResult: { xMin: 88, xMax: 100 },
    },
  }),
  questProfile("quest_advanced_lipid_v1", ["ADVANCED LIPID", "NMR", "LDL PARTICLE"], {
    knownPanelLabels: ["LDL PARTICLE NUMBER", "SMALL LDL-P"],
    knownRiskTables: ["RELATIVE RISK"],
  }),
  questProfile("quest_lipid_v1", ["LIPID PANEL", "LIPID"], {
    knownPanelLabels: ["LIPID PANEL"],
  }),
  questProfile("quest_thyroid_v1", ["THYROID"], {
    knownPanelLabels: ["THYROID PANEL", "TSH"],
  }),
  questProfile("quest_hormone_v1", ["HORMONE", "TESTOSTERONE", "ESTRADIOL"], {
    knownPanelLabels: ["TESTOSTERONE", "ESTRADIOL", "SHBG"],
  }),
];

export function getQuestPanelProfile(panelLabel: string | null | undefined): LabPanelLayoutProfile | null {
  if (!panelLabel) return null;
  const upper = panelLabel.toUpperCase();
  for (const profile of QUEST_PANEL_PROFILES) {
    if (profile.panelKeys.some((k) => upper.includes(k))) return profile;
    if (profile.knownPanelLabels.some((k) => upper.includes(k.toUpperCase()))) return profile;
  }
  return null;
}

export function defaultQuestPanelProfile(): LabPanelLayoutProfile {
  return QUEST_PANEL_PROFILES[0]!;
}
