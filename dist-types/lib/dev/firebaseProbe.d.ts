type Mode = "emulator" | "production" | "disabled";
export type ProbeResult = {
    status: "success" | "skipped" | "error";
    mode: Mode;
    message: string;
};
export declare function runFirestoreProbe(): Promise<ProbeResult>;
export {};
//# sourceMappingURL=firebaseProbe.d.ts.map