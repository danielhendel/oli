/**
 * Versioned lab unit registry — notation normalization only (Phase 3D-A).
 * No value conversion.
 */

import { LABS_UNIT_REGISTRY_VERSION, type LabUnitCandidate } from "@oli/contracts";

/** Canonical normalized unit tokens used for trend compatibility. */
export const LAB_UNIT_REGISTRY: Readonly<Record<string, string>> = {
  "mg/dl": "mg/dL",
  "mg/dL": "mg/dL",
  "ng/dl": "ng/dL",
  "ng/dL": "ng/dL",
  "pg/ml": "pg/mL",
  "pg/mL": "pg/mL",
  pg: "pg",
  "nmol/l": "nmol/L",
  "nmol/L": "nmol/L",
  "pmol/l": "pmol/L",
  "pmol/L": "pmol/L",
  "umol/l": "umol/L",
  "umol/L": "umol/L",
  "µmol/l": "umol/L",
  "miu/l": "mIU/L",
  "mIU/L": "mIU/L",
  "miu/ml": "mIU/mL",
  "mIU/mL": "mIU/mL",
  "uiu/ml": "uIU/mL",
  "uIU/mL": "uIU/mL",
  "µiu/ml": "uIU/mL",
  "cells/ul": "cells/uL",
  "cells/uL": "cells/uL",
  "cells/µl": "cells/uL",
  "cells/μl": "cells/uL",
  "thousand/ul": "Thousand/uL",
  "k/ul": "Thousand/uL",
  "10^3/ul": "Thousand/uL",
  "10^3/uL": "Thousand/uL",
  "million/ul": "Million/uL",
  "Million/uL": "Million/uL",
  "m/ul": "Million/uL",
  "10^6/ul": "Million/uL",
  "10^6/uL": "Million/uL",
  "%": "%",
  "u/l": "U/L",
  "U/L": "U/L",
  "iu/l": "U/L",
  "IU/L": "U/L",
  "g/dl": "g/dL",
  "g/dL": "g/dL",
  "g/l": "g/L",
  "g/L": "g/L",
  "mmol/l": "mmol/L",
  "mmol/L": "mmol/L",
  "meq/l": "mEq/L",
  "mEq/L": "mEq/L",
  "mg/l": "mg/L",
  "mg/L": "mg/L",
  "nmol/min/ml": "nmol/min/mL",
  "nmol/min/mL": "nmol/min/mL",
  "ng/ml": "ng/mL",
  "ng/mL": "ng/mL",
  "ug/dl": "ug/dL",
  "ug/dL": "ug/dL",
  "µg/dl": "ug/dL",
  "mcg/dl": "ug/dL",
  "mcg/dL": "ug/dL",
  "ug/l": "ug/L",
  "ug/L": "ug/L",
  "µg/l": "ug/L",
  "mcg/l": "ug/L",
  "mcg/L": "ug/L",
  "ug/ml": "ug/mL",
  "ug/mL": "ug/mL",
  "µg/ml": "ug/mL",
  fl: "fL",
  fL: "fL",
  "ml/min": "mL/min",
  "mL/min": "mL/min",
  "ml/min/1.73m2": "mL/min/1.73m2",
  "mL/min/1.73m2": "mL/min/1.73m2",
  "ml/min/1.73m²": "mL/min/1.73m2",
  "mL/min/1.73m²": "mL/min/1.73m2",
  "mm/hr": "mm/hr",
  "mm/h": "mm/hr",
  "mmol/mol": "mmol/mol",
  angstrom: "Angstrom",
  å: "Angstrom",
  pattern: "Pattern",
  calc: "calc",
  index: "index",
  ratio: "ratio",
};

function normalizeKey(raw: string): string {
  return raw.trim().replace(/\s+/g, "").replace(/µ/g, "u").replace(/μ/g, "u");
}

export function parseLabUnitCandidate(rawUnit: string | null | undefined): LabUnitCandidate {
  if (rawUnit == null || !rawUnit.trim()) {
    return {
      rawUnit: null,
      normalizedUnit: null,
      unitRegistryVersion: LABS_UNIT_REGISTRY_VERSION,
      confidence: 1,
      known: true,
    };
  }
  const raw = rawUnit.trim();
  const key = normalizeKey(raw);
  const lower = key.toLowerCase();

  // Prefer exact registry key, then case-insensitive.
  const direct = LAB_UNIT_REGISTRY[key] ?? LAB_UNIT_REGISTRY[raw];
  if (direct) {
    return {
      rawUnit: raw,
      normalizedUnit: direct,
      unitRegistryVersion: LABS_UNIT_REGISTRY_VERSION,
      confidence: 0.99,
      known: true,
    };
  }

  for (const [registryKey, normalized] of Object.entries(LAB_UNIT_REGISTRY)) {
    if (registryKey.toLowerCase() === lower) {
      return {
        rawUnit: raw,
        normalizedUnit: normalized,
        unitRegistryVersion: LABS_UNIT_REGISTRY_VERSION,
        confidence: 0.95,
        known: true,
      };
    }
  }

  return {
    rawUnit: raw,
    normalizedUnit: null,
    unitRegistryVersion: LABS_UNIT_REGISTRY_VERSION,
    confidence: 0.4,
    known: false,
  };
}

/** Trend-compatible when both sides have the same known normalized unit. */
export function unitsAreTrendCompatible(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  return a === b;
}
