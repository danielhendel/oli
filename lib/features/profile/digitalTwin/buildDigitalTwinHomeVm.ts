// lib/features/profile/digitalTwin/buildDigitalTwinHomeVm.ts
// Pure top-level builder. Composes system VMs → completeness → overview → priorities.
// No hooks, no Firebase. Deterministic from a TwinDataContext + loading flag.

import type {
  DigitalTwinHomeVm,
  SystemVm,
  TwinDataContext,
} from "@/lib/features/profile/digitalTwin/types";
import { DIGITAL_TWIN_SYSTEMS } from "@/lib/features/profile/digitalTwin/digitalTwinSystems";
import { buildDigitalTwinSystemVm } from "@/lib/features/profile/digitalTwin/buildDigitalTwinSystemVm";
import { buildDigitalTwinCompletenessVm } from "@/lib/features/profile/digitalTwin/buildDigitalTwinCompletenessVm";
import { buildDigitalTwinOverviewVm } from "@/lib/features/profile/digitalTwin/buildDigitalTwinOverviewVm";
import { buildDigitalTwinPrioritiesVm } from "@/lib/features/profile/digitalTwin/buildDigitalTwinPrioritiesVm";

export type BuildHomeInput = {
  ctx: TwinDataContext;
  loading: boolean;
};

export function buildDigitalTwinHomeVm(input: BuildHomeInput): DigitalTwinHomeVm {
  const { ctx, loading } = input;

  const systems: SystemVm[] = DIGITAL_TWIN_SYSTEMS.map((s) =>
    buildDigitalTwinSystemVm(s, ctx),
  );

  const completeness = buildDigitalTwinCompletenessVm(systems);
  const overview = buildDigitalTwinOverviewVm({ ctx, completeness, loading });
  const priorities = buildDigitalTwinPrioritiesVm({ ctx, systems });

  return {
    overview,
    priorities,
    systems,
    completeness,
    signedOut: ctx.signedOut,
  };
}
