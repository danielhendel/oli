import { useCallback, useMemo } from "react";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import type { DailyFactsDto } from "@/lib/contracts";

/** Mirrors backend EnergyFactor — values are display-only on the client. */
export type DailyEnergyFactorDto = {
  kcal?: number;
  kcalLow?: number;
  kcalHigh?: number;
  confidence?: "low" | "moderate" | "high";
  inputsUsed?: string[];
  inputsMissing?: string[];
};

export type DailyEnergyCardDto = {
  modelVersion: string;
  computedAt: string;
  day: string;
  estimatedKcal: { low: number; high: number; midpoint: number };
  variancePct: number;
  confidence: "low" | "moderate" | "high";
  factors: {
    baseline?: DailyEnergyFactorDto;
    steps?: DailyEnergyFactorDto;
    cardio?: DailyEnergyFactorDto;
    strength?: DailyEnergyFactorDto;
  };
  missingRequiredInputs: string[];
  largestDriver?: "baseline" | "steps" | "cardio" | "strength";
  energyInfluencers?: {
    movement?: {
      steps?: number;
      distanceMeters?: number;
      activeEnergyKcal?: number;
      exerciseMinutes?: number;
      standHours?: number;
    };
    cardio?: {
      durationMinutes?: number;
      distanceMeters?: number;
      sport?: string;
      averageHeartRateBpm?: number;
      maxHeartRateBpm?: number;
      paceMinPerKm?: number;
      speedMetersPerSecond?: number;
      activeEnergyKcal?: number;
      /** Workout Physiology v1 — sum of `totalEnergyKcal` across cardio workouts. */
      totalEnergyKcal?: number;
      /** Workout Physiology v1 — tuple-sum of zone minutes across cardio workouts. */
      heartRateZoneMinutes?: readonly [number, number, number, number, number];
      /** Stamp for the daily zone tuple. Present only when all contributing sessions agree. */
      heartRateZoneBasis?: {
        modelVersion: "default_thresholds_v1";
        thresholdsBpm: readonly [number, number, number, number];
      };
    };
    strength?: {
      durationMinutes?: number;
      volumeKg?: number;
      sets?: number;
      reps?: number;
      densityKgPerMinute?: number;
      activeEnergyKcal?: number;
      averageHeartRateBpm?: number;
      maxHeartRateBpm?: number;
      /** Workout Physiology v1 — sum of `totalEnergyKcal` across strength-tagged workouts. */
      totalEnergyKcal?: number;
      /** Workout Physiology v1 (Phase C) — tuple-sum of zone minutes across strength-tagged workouts. */
      heartRateZoneMinutes?: readonly [number, number, number, number, number];
      /** Stamp for the daily zone tuple. Present only when all contributing sessions agree. */
      heartRateZoneBasis?: {
        modelVersion: "default_thresholds_v1";
        thresholdsBpm: readonly [number, number, number, number];
      };
    };
    physiology?: {
      restingHeartRateBpm?: number;
      hrvRmssdMs?: number;
    };
  };
};

type EnergyState = {
  energy: DailyEnergyCardDto | undefined;
  loading: boolean;
  error: string | null;
  refetch: (opts?: { cacheBust?: string }) => void;
};

export function useDailyEnergyCard(day: string): EnergyState {
  const facts = useDailyFacts(day);
  const refetch = useCallback(
    (opts?: { cacheBust?: string }) => {
      facts.refetch(opts);
    },
    [facts.refetch],
  );

  return useMemo(() => {
    if (facts.status === "ready") {
      const data = facts.data as DailyFactsDto & {
        energy?: DailyEnergyCardDto;
        energyInfluencers?: DailyEnergyCardDto["energyInfluencers"];
      };
      const rawEnergy = data.energy;
      // Server stores `energyInfluencers` as a TOP-LEVEL sibling of `energy` on
      // the DailyFacts document. Existing Today VMs (Strength/Cardio) and the HR
      // detail modal read `energy.energyInfluencers.{cardio,strength}` — merge the
      // sibling field into the returned shape here so the read path stays stable
      // across all consumers. Prefer a server-nested value when present
      // (forward-compat); otherwise fall back to the sibling field.
      const energy =
        rawEnergy && !rawEnergy.energyInfluencers && data.energyInfluencers
          ? { ...rawEnergy, energyInfluencers: data.energyInfluencers }
          : rawEnergy;
      return { energy, loading: false, error: null, refetch };
    }
    if (facts.status === "error") {
      return { energy: undefined, loading: false, error: facts.error, refetch };
    }
    return { energy: undefined, loading: facts.status === "partial", error: null, refetch };
  }, [facts, refetch]);
}
