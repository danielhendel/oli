import type { Readiness } from "../contracts/readiness";
import type { DailyFactsDto } from "../contracts/dailyFacts";
export type ReadinessVocabularyState = Readiness;
export type NutritionSummaryUi = {
    totalKcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
};
export type NutritionCommandCenterModel = {
    state: ReadinessVocabularyState;
    title: string;
    description: string;
    summary: NutritionSummaryUi | null;
    showLogCta: boolean;
    showFailuresCta: boolean;
};
export declare function buildNutritionCommandCenterModel(args: {
    dataReadinessState: ReadinessVocabularyState;
    factsDoc: DailyFactsDto | null;
    hasFailures: boolean;
}): NutritionCommandCenterModel;
//# sourceMappingURL=commandCenterNutrition.d.ts.map