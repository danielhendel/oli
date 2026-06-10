// lib/features/profile/digitalTwin/buildDigitalTwinCompletenessVm.ts
// Pure builder: derives Digital Twin completeness from already-built SystemVms.
// Shares the SystemVm status union so it can NEVER conflict with HealthScore status
// (domain-backed systems already resolve to needsData when HealthScore is insufficient).

import type {
  CompletenessSystemState,
  CompletenessVm,
  DigitalTwinSystemId,
  SystemVm,
} from "@/lib/features/profile/digitalTwin/types";
import { REAL_DATA_SYSTEM_IDS } from "@/lib/features/profile/digitalTwin/digitalTwinSystems";

const TRACKABLE = new Set<DigitalTwinSystemId>(REAL_DATA_SYSTEM_IDS);

function hasData(state: CompletenessSystemState): boolean {
  return state === "strong" || state === "good" || state === "watch";
}

export function buildDigitalTwinCompletenessVm(systems: SystemVm[]): CompletenessVm {
  const bySystem = {} as Record<DigitalTwinSystemId, CompletenessSystemState>;

  for (const s of systems) {
    bySystem[s.id] = s.status;
  }

  let systemsWithData = 0;
  let systemsNeedingData = 0;
  const systemsTrackable = TRACKABLE.size;

  for (const id of REAL_DATA_SYSTEM_IDS) {
    const state = bySystem[id];
    if (state == null) continue;
    if (hasData(state)) systemsWithData += 1;
    else systemsNeedingData += 1;
  }

  return {
    systemsWithData,
    systemsTrackable,
    systemsNeedingData,
    bySystem,
  };
}
