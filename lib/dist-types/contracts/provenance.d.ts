/**
 * Thresholds as displayed in provenance (signals only).
 * Explicit constants as received in doc.inputs.thresholds; UI display only.
 */
export type ProvenanceThresholds = {
    compositeAttentionLt: number;
    domainAttentionLt: number;
    deviationAttentionPctLt: number;
};
/**
 * Minimal, stable view model for provenance drawer.
 * Used for Health Score and Health Signals provenance display.
 * Does not alter HealthScoreDoc or HealthSignalDoc schemas.
 */
export type ProvenanceViewModel = {
    title: string;
    modelVersion: string;
    computedAt: string;
    pipelineVersion?: number;
    missingInputs: string[];
    /** Only for signals; thresholds used (from doc.inputs.thresholds) */
    thresholds?: ProvenanceThresholds;
    /** Static label, e.g. "Derived from DailyFacts" or "Derived from HealthScore + Baseline window" */
    derivedFromLabel: string;
};
//# sourceMappingURL=provenance.d.ts.map