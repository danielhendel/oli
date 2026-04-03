// lib/profile/profileLabels.ts — human-readable labels for profile enums
import type {
  ProfileLengthUnit,
  ProfilePrimaryGoal,
  ProfileSexAtBirth,
  ProfileWeighInPreference,
} from "@oli/contracts";

export const SEX_AT_BIRTH_LABELS: Record<ProfileSexAtBirth, string> = {
  female: "Female",
  male: "Male",
  intersex: "Intersex",
  unspecified: "Prefer not to say",
};

export const PRIMARY_GOAL_LABELS = {
  lose_fat: "Lose fat",
  build_muscle: "Build muscle",
  maintain: "Maintain",
  athletic_performance: "Athletic performance",
  general_health: "General health",
} as const satisfies Record<ProfilePrimaryGoal, string>;

export const WEIGH_IN_LABELS = {
  morning_fasted: "Morning (fasted)",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  anytime: "Any time",
} as const satisfies Record<ProfileWeighInPreference, string>;

export const LENGTH_UNIT_LABELS = {
  cm: "Centimeters (cm)",
  in: "Feet & inches",
} as const satisfies Record<ProfileLengthUnit, string>;
