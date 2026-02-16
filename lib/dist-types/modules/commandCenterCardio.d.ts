import type { Readiness } from "../contracts/readiness";
import type { DailyFactsDto } from "../contracts/dailyFacts";
export type ReadinessVocabularyState = Readiness;
export type CardioSummaryUi = {
    steps?: number;
    moveMinutes?: number;
    distanceKm?: number;
    trainingLoad?: number;
};
export type CardioCommandCenterModel = {
    state: ReadinessVocabularyState;
    title: string;
    description: string;
    summary: CardioSummaryUi | null;
    showWorkoutsCta: boolean;
    showFailuresCta: boolean;
};
/**
 * US locales use miles-first display; others use km-first.
 * Heuristic: locale starts with "en-US" or equals "en-US".
 */
export declare function isMilesFirstLocale(locale: string): boolean;
export declare function formatDistanceDualDisplay(args: {
    distanceKm: number;
    locale?: string;
}): {
    primary: string;
    secondary: string;
    combined: string;
};
export declare function buildCardioCommandCenterModel(args: {
    dataReadinessState: ReadinessVocabularyState;
    factsDoc: DailyFactsDto | null;
    hasFailures: boolean;
    locale?: string;
}): CardioCommandCenterModel;
//# sourceMappingURL=commandCenterCardio.d.ts.map