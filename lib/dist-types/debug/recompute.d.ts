export type RecomputeResult = {
    ok: true;
    date: string;
    details: {
        dailyFacts: string;
        insights: string;
        context: string;
    };
} | {
    ok: false;
    step: "dailyFacts" | "insights" | "context";
    error: string;
};
export declare const recomputeTodayPipeline: (userId: string) => Promise<RecomputeResult>;
//# sourceMappingURL=recompute.d.ts.map