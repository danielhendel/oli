import type { Readiness } from "../contracts/readiness";
import type { DailyFactsDto } from "../contracts/dailyFacts";
export type ReadinessVocabularyState = Readiness;
export type BodySummaryUi = {
    weightKg?: number;
    bodyFatPercent?: number;
};
export type BodyCommandCenterModel = {
    state: ReadinessVocabularyState;
    title: string;
    description: string;
    summary: BodySummaryUi | null;
    showLogWeightCta: boolean;
    showFailuresCta: boolean;
};
/**
 * US locales use lbs-first display; others use kg-first.
 * Heuristic: locale starts with "en-US" or equals "en-US" (match cardio approach).
 */
export declare function isLbsFirstLocale(locale: string): boolean;
export declare function formatWeightDualDisplay(args: {
    weightKg: number;
    locale?: string;
}): {
    primary: string;
    secondary: string;
    combined: string;
};
export declare function buildBodyCommandCenterModel(args: {
    dataReadinessState: ReadinessVocabularyState;
    factsDoc: DailyFactsDto | null;
    hasFailures: boolean;
    locale?: string;
}): BodyCommandCenterModel;
//# sourceMappingURL=commandCenterBody.d.ts.map