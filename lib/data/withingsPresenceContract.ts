/**
 * Contract: Withings weight RawEvents use kind "weight" and sourceId "withings".
 * Used by useWithingsPresence and by regression tests. Do not regress.
 */
export const WITHINGS_WEIGHT_KIND = "weight" as const;
export const WITHINGS_SOURCE_ID = "withings" as const;
