export type WeightBaselineChartPoint = {
    observedAt: string;
    weightKg: number;
};
type Props = {
    points: readonly WeightBaselineChartPoint[];
    lowKg: number;
    highKg: number;
    currentKg: number;
    classification: "maintaining" | "gaining" | "losing";
};
export declare function WeightBaselineChart({ points, lowKg, highKg, currentKg, classification, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=WeightBaselineChart.d.ts.map