import type { HealthScoreTier, HealthScoreStatus } from "@/lib/contracts";
export declare function formatHealthScoreTier(tier: HealthScoreTier): string;
export declare function formatHealthScoreStatus(status: HealthScoreStatus): string;
/** Format missing[] for display (e.g. "Missing: sleep, steps"). */
export declare function formatMissingList(missing: string[]): string;
//# sourceMappingURL=healthScore.d.ts.map