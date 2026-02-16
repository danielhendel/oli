import type { CanonicalEvent, DailyFacts, IsoDateTimeString, YmdDateString } from '../types/health';
export interface AggregateDailyFactsInput {
    userId: string;
    date: YmdDateString;
    computedAt: IsoDateTimeString;
    events: CanonicalEvent[];
}
/**
 * Aggregate CanonicalEvents for a single user + day into a DailyFacts document.
 *
 * - Pure and deterministic given the input.
 * - Uses only CanonicalEvents, never RawEvents.
 * - Safe for scheduled jobs and reprocessing pipelines.
 */
export declare const aggregateDailyFactsForDay: (input: AggregateDailyFactsInput) => DailyFacts;
//# sourceMappingURL=aggregateDailyFacts.d.ts.map