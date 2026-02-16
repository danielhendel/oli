import type { Readiness } from "../contracts/readiness";
import type { DailyFactsDto } from "../contracts/dailyFacts";
export type ReadinessVocabularyState = Readiness;
export type StrengthSummaryUi = {
    workoutsCount: number;
    totalSets: number;
    totalReps: number;
    totalVolumeByUnit: {
        lb?: number;
        kg?: number;
    };
};
export type StrengthCommandCenterModel = {
    state: ReadinessVocabularyState;
    title: string;
    description: string;
    summary: StrengthSummaryUi | null;
    showLogCta: boolean;
    showFailuresCta: boolean;
};
export declare function buildStrengthCommandCenterModel(args: {
    dataReadinessState: ReadinessVocabularyState;
    factsDoc: DailyFactsDto | null;
    hasFailures: boolean;
}): StrengthCommandCenterModel;
//# sourceMappingURL=commandCenterStrength.d.ts.map