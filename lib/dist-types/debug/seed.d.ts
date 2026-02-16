import { type JsonValue } from "../api/http";
export type SeedResult = {
    ok: true;
    rawEventId?: string;
    response: JsonValue;
};
export declare const seedTodayWeight: () => Promise<SeedResult>;
//# sourceMappingURL=seed.d.ts.map