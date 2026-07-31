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
  "nmol/l": "nmol/L",
  "nmol/L": "nmol/L",
  "miu/l": "mIU/L",
  "mIU/L": "mIU/L",
  "uiu/ml": "uIU/mL",
  "uIU/mL": "uIU/mL",
  "µiu/ml": "uIU/mL",
  "cells/ul": "cells/uL",
  "cells/uL": "cells/uL",
  "thousand/ul": "Thousand/uL",
  "k/ul": "Thousand/uL",
  "10^3/ul": "Thousand/uL",
  "10^3/uL": "Thousand/uL",
  "%": "%",
  "u/l": "U/L",
  "U/L": "U/L",
  "iu/l": "U/L",
  "g/dl": "g/dL",
  "g/dL": "g/dL",
  "mmol/l": "mmol/L",
  "mmol/L": "mmol/L",
  "mg/l": "mg/L",
  "mg/L": "mg/L",
  "ng/ml": "ng/mL",
  "ng/mL": "ng/mL",
  "ug/dl": "ug/dL",
  "ug/dL": "ug/dL",
  "µg/dl": "ug/dL",
  "ml/min/1.73m2": "mL/min/1.73m2",
  "mL/min/1.73m2": "mL/min/1.73m2",
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
