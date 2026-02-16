import type { HealthScoreDoc } from "@/lib/contracts";
/** Display content for General baseline panel (date, computedAt, status). */
export type GeneralBaselineContent = {
    date: string;
    computedAt: string;
    status: string;
};
/** Display content for Personal baseline panel (inputs used). */
export type PersonalBaselineContent = {
    historyDaysUsed: number;
    hasDailyFacts: boolean;
};
/** Display content for Optimization baseline panel (model/pipeline context). */
export type OptimizationBaselineContent = {
    modelVersion: string;
    pipelineVersion: number;
    schemaVersion: number;
};
/** Derive General baseline display from HealthScoreDoc. */
export declare function getGeneralBaselineContent(doc: HealthScoreDoc): GeneralBaselineContent;
/** Derive Personal baseline display from HealthScoreDoc. */
export declare function getPersonalBaselineContent(doc: HealthScoreDoc): PersonalBaselineContent;
/** Derive Optimization baseline display from HealthScoreDoc. */
export declare function getOptimizationBaselineContent(doc: HealthScoreDoc): OptimizationBaselineContent;
//# sourceMappingURL=baselines.d.ts.map