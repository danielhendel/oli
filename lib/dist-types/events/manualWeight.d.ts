import type { LogWeightRequestDto } from "@/lib/contracts";
export declare const poundsToKg: (lbs: number) => number;
export declare const buildManualWeightPayload: (args: {
    time: string;
    timezone: string;
    weightLbs: number;
    bodyFatPercent?: number | null;
}) => LogWeightRequestDto;
export declare const manualWeightIdempotencyKey: (payload: LogWeightRequestDto) => string;
//# sourceMappingURL=manualWeight.d.ts.map