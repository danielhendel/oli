import { z } from "zod";
export declare const massUnitSchema: z.ZodEnum<["lb", "kg"]>;
export type MassUnit = z.infer<typeof massUnitSchema>;
export declare const timezoneModeSchema: z.ZodEnum<["recorded", "current", "explicit"]>;
export type TimezoneMode = z.infer<typeof timezoneModeSchema>;
/**
 * Phase 1 view preferences.
 *
 * Invariants:
 * - Preferences only affect presentation (units/timezone bucketing).
 * - Canonical truth remains stored in canonical units (e.g., kg) and immutable day keys.
 */
export declare const preferencesSchema: z.ZodEffects<z.ZodObject<{
    units: z.ZodObject<{
        mass: z.ZodEnum<["lb", "kg"]>;
    }, "strip", z.ZodTypeAny, {
        mass: "lb" | "kg";
    }, {
        mass: "lb" | "kg";
    }>;
    timezone: z.ZodObject<{
        mode: z.ZodEnum<["recorded", "current", "explicit"]>;
        explicitIana: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        mode: "recorded" | "current" | "explicit";
        explicitIana?: string | undefined;
    }, {
        mode: "recorded" | "current" | "explicit";
        explicitIana?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    timezone: {
        mode: "recorded" | "current" | "explicit";
        explicitIana?: string | undefined;
    };
    units: {
        mass: "lb" | "kg";
    };
}, {
    timezone: {
        mode: "recorded" | "current" | "explicit";
        explicitIana?: string | undefined;
    };
    units: {
        mass: "lb" | "kg";
    };
}>, {
    timezone: {
        mode: "recorded" | "current" | "explicit";
        explicitIana?: string | undefined;
    };
    units: {
        mass: "lb" | "kg";
    };
}, {
    timezone: {
        mode: "recorded" | "current" | "explicit";
        explicitIana?: string | undefined;
    };
    units: {
        mass: "lb" | "kg";
    };
}>;
export type Preferences = z.infer<typeof preferencesSchema>;
/**
 * Phase 1 defaults.
 *
 * Product decision:
 * - US-default weight display uses pounds.
 */
export declare const defaultPreferences: () => Preferences;
//# sourceMappingURL=preferences.d.ts.map