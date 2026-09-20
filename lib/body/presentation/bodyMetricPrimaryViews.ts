/**
 * Stage 3B Body card primary display views — presentation only.
 * Does not mutate measurements, preferences, or Apple Health sync scope.
 */

export type WeightPrimaryView = "mass" | "bmi";
export type BodyFatPrimaryView = "percentage" | "fatMass";
export type LeanMassPrimaryView = "percentage" | "mass";

export type BodyPrimaryViewState = {
  readonly weight: WeightPrimaryView;
  readonly bodyFat: BodyFatPrimaryView;
  readonly leanMass: LeanMassPrimaryView;
};

export const DEFAULT_BODY_PRIMARY_VIEW_STATE: BodyPrimaryViewState = {
  weight: "mass",
  bodyFat: "percentage",
  leanMass: "mass",
};

export type BodyMassDisplayUnit = "lb" | "kg";

export type BodyDerivationStatus =
  | "ready"
  | "missing"
  | "incompatible"
  | "conflicting"
  | "stale"
  | "error";

export type BodyDerivedQuantityResult =
  | {
      readonly status: "ready";
      readonly valueKg: number;
      readonly provenanceLabel: string;
    }
  | {
      readonly status: Exclude<BodyDerivationStatus, "ready">;
      readonly valueKg: null;
      readonly reason: string;
    };
