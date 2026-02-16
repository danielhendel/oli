export type ProvenanceRowProps = {
    /**
     * Minimal provenance surface for explainability.
     * Required by Phase 1 §4.2.
     */
    computedAtIso: string | null;
    pipelineVersion: number | null;
    latestCanonicalEventAtIso: string | null;
    eventsCount: number | null;
    hash?: string | null;
    /**
     * Optional label for the row (e.g. "Today", "Daily facts").
     * Keep short; this is meant to be “small print”.
     */
    label?: string;
};
export declare function ProvenanceRow({ computedAtIso, pipelineVersion, latestCanonicalEventAtIso, eventsCount, hash, label, }: ProvenanceRowProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ProvenanceRow.d.ts.map