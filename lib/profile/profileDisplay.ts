// lib/profile/profileDisplay.ts
import type { ProfileLengthUnit } from "@oli/contracts";
import { cmToFeetInches } from "./heightConvert";
import {
  LENGTH_UNIT_LABELS,
  PRIMARY_GOAL_LABELS,
  SEX_AT_BIRTH_LABELS,
  WEIGH_IN_LABELS,
} from "./profileLabels";
import type { ProfilePrimaryGoal, ProfileSexAtBirth, ProfileWeighInPreference } from "@oli/contracts";

export function formatHeightForDisplay(heightCm: number | null, lengthUnit: ProfileLengthUnit): string {
  if (heightCm == null) return "—";
  if (lengthUnit === "cm") {
    return `${Math.round(heightCm)} cm`;
  }
  const { feet, inches } = cmToFeetInches(heightCm);
  return `${feet}'${inches}"`;
}

export function formatSexAtBirth(v: ProfileSexAtBirth | null): string {
  if (!v) return "—";
  return SEX_AT_BIRTH_LABELS[v];
}

export function formatPrimaryGoal(v: ProfilePrimaryGoal | null): string {
  if (!v) return "—";
  return PRIMARY_GOAL_LABELS[v];
}

export function formatWeighIn(v: ProfileWeighInPreference | null): string {
  if (!v) return "—";
  return WEIGH_IN_LABELS[v];
}

export function formatLengthUnit(u: ProfileLengthUnit): string {
  return LENGTH_UNIT_LABELS[u];
}

export function massUnitLabel(m: "lb" | "kg"): string {
  return m === "lb" ? "Pounds (lb)" : "Kilograms (kg)";
}
