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
    };
    strength?: {
      durationMinutes?: number;
      volumeKg?: number;
      sets?: number;
      reps?: number;
      densityKgPerMinute?: number;
      activeEnergyKcal?: number;
      averageHeartRateBpm?: number;
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
      const energy = (facts.data as DailyFactsDto & { energy?: DailyEnergyCardDto }).energy;
      return { energy, loading: false, error: null, refetch };
    }
    if (facts.status === "error") {
      return { energy: undefined, loading: false, error: facts.error, refetch };
    }
    return { energy: undefined, loading: facts.status === "partial", error: null, refetch };
  }, [facts, refetch]);
}
