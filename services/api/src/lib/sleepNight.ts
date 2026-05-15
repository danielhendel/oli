/**
 * Canonical SleepNight read model from Oura sleep API / ingest-shaped documents.
 * Anchor day matches `resolveOuraSleepIngestBase` rollup semantics (same as vendor snapshot `day`).
 */

export type { SleepNightBuildContext } from "./oura/buildSleepNightFromOuraDocument";
export {
  buildSleepNightFromOuraSleepDocument,
  coerceOuraSleepScore0to100,
} from "./oura/buildSleepNightFromOuraDocument";
