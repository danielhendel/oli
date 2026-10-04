/**
 * Shared Body Composition Dual Score constants (mathematical truth freeze).
 */

export const DAY_MS = 86_400_000 as const;
export const MAX_SCORE_INPUT_AGE_MS = 180 * DAY_MS;
export const MAX_SCORE_CONSTRUCT_GAP_MS = 90 * DAY_MS;

export const SCORE_POLICY_VERSION = "body_composition_dual_score_math_freeze_v1" as const;

/** Channel ids from Resolver policy — consumed, never invented. */
export const H1_WHTR_CHANNEL_ID = "whtr_standardized" as const;
export const FMI_CHANNEL_ID = "fmi" as const;
export const ALMI_CHANNEL_ID = "almi" as const;
export const FFMI_CHANNEL_ID = "ffmi" as const;

export const WHTR_FORMULA_VERSION = "whtr_v1" as const;
export const FMI_FORMULA_VERSION = "fmi_v1" as const;
export const FFMI_FORMULA_VERSION = "ffmi_v1" as const;
export const ALMI_FORMULA_VERSION = "almi_v1" as const;

export const WHO_MIDPOINT_PROTOCOL_ID = "who_midpoint_v1" as const;
export const WHO_MIDPOINT_PROTOCOL_VERSION = 1 as const;
