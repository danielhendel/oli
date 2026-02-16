// services/functions/src/validation/rawEvent.ts
import { rawEventDocSchema } from "@oli/contracts";
/**
 * Contract-first validation:
 * - Validates raw Firestore doc against authoritative schema
 * - Prevents drift/corruption
 */
export const parseRawEventContract = (data) => {
    const parsed = rawEventDocSchema.safeParse(data);
    if (!parsed.success) {
        return { ok: false, issues: parsed.error.flatten() };
    }
    return { ok: true, data: parsed.data };
};
/**
 * ✅ Compatibility wrapper used throughout the functions pipeline.
 * Keeps the rest of the pipeline unchanged while enforcing the contract.
 */
export const parseRawEvent = (data) => {
    const contract = parseRawEventContract(data);
    if (!contract.ok) {
        return { ok: false, reason: "INVALID_RAW_EVENT_CONTRACT", issues: contract.issues };
    }
    return { ok: true, value: contract.data };
};
