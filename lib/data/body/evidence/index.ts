export { buildBodyCompositionEvidenceBundle, buildEvidenceCompleteness, sourceArrayPresence } from "./buildBodyCompositionEvidenceBundle";
export type { BuildBodyCompositionEvidenceBundleInput } from "./buildBodyCompositionEvidenceBundle";
export {
  adaptContinuousBodyEvidenceEvent,
  adaptContinuousBodyEvidenceEvents,
} from "./continuousEvidenceAdapter";
export type { ContinuousBodyEvidenceEventInput } from "./continuousEvidenceAdapter";
export {
  adaptVerifiedBodyScanEvidence,
  adaptVerifiedBodyScanEvidenceMany,
} from "./bodyScanEvidenceAdapter";
export {
  calculateAlmiObservation,
  calculateBmiObservation,
  calculateFfmiObservation,
  calculateFmiObservation,
  calculateWhtrObservation,
  BODY_COMPOSITION_FORMULA_VERSION,
  BMI_FORMULA_VERSION,
  WHTR_FORMULA_VERSION,
  FMI_FORMULA_VERSION,
  FFMI_FORMULA_VERSION,
  ALMI_FORMULA_VERSION,
} from "./formulas";
export { buildBodyCompositionSubjectContext } from "./subjectContext";
export { BODY_COMPOSITION_EVIDENCE_METRIC_REGISTRY } from "./metricRegistry";
export { useBodyCompositionEvidence } from "./useBodyCompositionEvidence";
export { resolveBodyCompositionEvidence } from "./resolver/resolveBodyCompositionEvidence";
export type { ResolveBodyCompositionEvidenceInput } from "./resolver/resolveBodyCompositionEvidence";
export {
  BODY_COMPOSITION_RESOLVER_CONSTRUCT_POLICIES,
  RESOLVER_POLICY_VERSION,
} from "./resolver/policy";
export { assessBodyCompositionConfidence } from "./confidence/assessBodyCompositionConfidence";
export type { AssessBodyCompositionConfidenceInput } from "./confidence/assessBodyCompositionConfidence";
export {
  CONFIDENCE_POLICY_VERSION,
  FROZEN_LABEL_RULE_COUNT,
  LABEL_POLICY_STATE,
} from "./confidence/policy";
// Dual Score engines are intentionally NOT re-exported from the evidence barrel
// so consumer runtime cannot reach them via the standard evidence import path.
// Import only from `lib/data/body/evidence/scoring` for internal draft use.
