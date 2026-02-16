import type { ModuleSectionId } from "@/lib/modules/moduleSectionRoutes";
/** Phase 1 Lock #3: Canonical readiness. "partial" = not yet available (e.g. coming soon). */
export type ReadinessStatus = "ready" | "partial";
export type SectionReadiness = {
    status: ReadinessStatus;
    disabled: boolean;
    badge?: string;
};
/**
 * Central readiness resolver for module sections.
 * Keep all "what is live vs soon" logic here.
 */
export declare function getSectionReadiness(sectionId: ModuleSectionId): SectionReadiness;
//# sourceMappingURL=moduleReadiness.d.ts.map