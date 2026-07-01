export {
  buildTop25KeyframeSpecRegistryReadiness,
  buildTop25KeyframeSpecReadiness,
  listValidatedTop25ExerciseKeyframeSpecs,
  type Top25KeyframeSpecRegistryReadinessLabel,
  type Top25KeyframeSpecRegistryReadinessReport,
} from "./buildTop25KeyframeSpecRegistryReadiness";

/** @deprecated Use Top25KeyframeSpecRegistryReadinessReport */
export type Top25KeyframeSpecReadinessLabel = import("./buildTop25KeyframeSpecRegistryReadiness").Top25KeyframeSpecRegistryReadinessLabel;

/** @deprecated Use Top25KeyframeSpecRegistryReadinessReport */
export type Top25KeyframeSpecReadinessReport = import("./buildTop25KeyframeSpecRegistryReadiness").Top25KeyframeSpecRegistryReadinessReport;
