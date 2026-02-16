export type ReplaySelection = {
    mode: "latest";
} | {
    mode: "run";
    runId: string;
} | {
    mode: "asOf";
    asOf: string;
};
export declare const replaySelectionLatest: () => ReplaySelection;
export declare const replaySelectionRun: (runId: string) => ReplaySelection;
export declare const replaySelectionAsOf: (asOf: string) => ReplaySelection;
export declare function isReplayEnabled(sel: ReplaySelection): boolean;
//# sourceMappingURL=replaySession.d.ts.map