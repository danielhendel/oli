import { type Preferences, type MassUnit } from "@oli/contracts";
import type { ApiResult } from "./http";
export declare function getPreferences(idToken: string): Promise<ApiResult<Preferences>>;
export declare function updateMassUnit(idToken: string, mass: MassUnit): Promise<ApiResult<Preferences>>;
//# sourceMappingURL=preferences.d.ts.map