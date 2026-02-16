/**
 * Timeline range utilities for day/week/month navigation.
 * Deterministic: same anchor + viewMode → same { start, end }.
 */
export type TimelineViewMode = "day" | "week" | "month";
export declare function getRangeForViewMode(anchorDay: string, viewMode: TimelineViewMode): {
    start: string;
    end: string;
};
export declare function shiftAnchor(anchorDay: string, deltaDays: number): string;
export declare function getDaysVisible(viewMode: TimelineViewMode): number;
//# sourceMappingURL=timelineRange.d.ts.map