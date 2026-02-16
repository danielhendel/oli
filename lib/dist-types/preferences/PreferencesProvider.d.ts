import React from "react";
import { type Preferences, type MassUnit } from "@oli/contracts";
type PreferencesState = {
    status: "partial";
    preferences: Preferences;
} | {
    status: "ready";
    preferences: Preferences;
} | {
    status: "error";
    preferences: Preferences;
    message: string;
};
type PreferencesContextValue = {
    state: PreferencesState;
    refresh: () => Promise<void>;
    setMassUnit: (mass: MassUnit) => Promise<void>;
};
export declare const PreferencesProvider: React.FC<React.PropsWithChildren>;
export declare function usePreferences(): PreferencesContextValue;
export {};
//# sourceMappingURL=PreferencesProvider.d.ts.map