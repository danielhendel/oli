import type { Readiness } from "../contracts/readiness";
import type { DailyFactsDto } from "../contracts/dailyFacts";
export type ReadinessVocabularyState = Readiness;
export type RecoverySummaryUi = {
    hrvRmssd?: number;
    hrvRmssdBaseline?: number;
    hrvRmssdDeviation?: number;
};
export type RecoveryCommandCenterModel = {
    state: ReadinessVocabularyState;
    title: string;
    description: string;
    summary: RecoverySummaryUi | null;
    showReadinessCta: boolean;
    showFailuresCta: boolean;
};
export declare function buildRecoveryCommandCenterModel(args: {
    dataReadinessState: ReadinessVocabularyState;
    factsDoc: DailyFactsDto | null;
    hasFailures: boolean;
}): RecoveryCommandCenterModel;
//# sourceMappingURL=commandCenterRecovery.d.ts.map