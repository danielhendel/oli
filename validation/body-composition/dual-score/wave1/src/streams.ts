/**
 * Seed / stream derivation (plan §23.2.1–§23.2.2). Integer arithmetic only.
 *
 * derivedSeed =
 *   canonicalSeed
 *   + streamCode   * 1_000_000
 *   + personaIndex * 10_000
 *   + sigmaIndex   * 1_000
 *   + rhoIndex     * 100
 *   + modelIndex   * 10
 *   + substreamIndex
 *
 * No hashed/string-derived seeds.
 *
 * KNOWN FORMULA PROPERTY (documented, not "fixed"): directional-reversal
 * substreams (scoreBase + 2k / + 2k + 1, k up to N_pairs ≤ 1e6) can exceed the
 * 10_000-wide persona digit and spill into neighbouring index digits — and,
 * past 999_999, into streamCode digits. Within one configuration the A/B seeds
 * are all distinct; ACROSS configurations of the same protocol, reversal seeds
 * may coincide with other configurations' reversal seeds. `findSeedCollisions`
 * is provided to quantify this; the formula itself is frozen by §23.2.2.
 */

import { CANONICAL_SEED, RHO_GRID, SIGMA_MULTIPLIERS, STREAM_CODES } from "./constants";
import type { ProtocolId } from "./constants";

export const SCORE_BASE = { health: 100, perf: 200 } as const;
export type ScoreKind = keyof typeof SCORE_BASE;

export type ModelKind = "A" | "B";

export function sigmaIndexOf(multiplier: number): number {
  const i = (SIGMA_MULTIPLIERS as readonly number[]).indexOf(multiplier);
  if (i < 0) throw new Error(`sigma_multiplier_not_in_grid:${multiplier}`);
  return i;
}

/** Model A → 0; Model B → position in RHO_GRID. */
export function rhoIndexOf(model: ModelKind, rho: number | null): number {
  if (model === "A") return 0;
  if (rho == null) throw new Error("rho_required_for_model_B");
  const i = (RHO_GRID as readonly number[]).indexOf(rho);
  if (i < 0) throw new Error(`rho_not_in_grid:${rho}`);
  return i;
}

export function modelIndexOf(model: ModelKind): number {
  return model === "A" ? 0 : 1;
}

export type SeedParts = {
  streamCode: number;
  personaIndex?: number;
  sigmaIndex?: number;
  rhoIndex?: number;
  modelIndex?: number;
  substreamIndex?: number;
  canonicalSeed?: number;
};

export function derivedSeed(parts: SeedParts): number {
  const seed =
    (parts.canonicalSeed ?? CANONICAL_SEED) +
    parts.streamCode * 1_000_000 +
    (parts.personaIndex ?? 0) * 10_000 +
    (parts.sigmaIndex ?? 0) * 1_000 +
    (parts.rhoIndex ?? 0) * 100 +
    (parts.modelIndex ?? 0) * 10 +
    (parts.substreamIndex ?? 0);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error(`derived_seed_out_of_uint32_range:${seed}`);
  }
  return seed;
}

export function streamCodeOf(protocolId: ProtocolId): number {
  return STREAM_CODES[protocolId];
}

/** Main-stream substream: Health → 0, Perf → 1. */
export function mainSubstream(score: ScoreKind): number {
  return score === "health" ? 0 : 1;
}

/** §23.17.2: replicate A = scoreBase + 2k; replicate B = scoreBase + 2k + 1. */
export function reversalSubstream(score: ScoreKind, k: number, replicate: "A" | "B"): number {
  return SCORE_BASE[score] + 2 * k + (replicate === "A" ? 0 : 1);
}

export type NoiseConfigSeedArgs = {
  protocolId: ProtocolId;
  personaIndex: number;
  sigmaMultiplier: number;
  model: ModelKind;
  rho: number | null;
};

export function noiseConfigBase(args: NoiseConfigSeedArgs): SeedParts {
  return {
    streamCode: streamCodeOf(args.protocolId),
    personaIndex: args.personaIndex,
    sigmaIndex: sigmaIndexOf(args.sigmaMultiplier),
    rhoIndex: rhoIndexOf(args.model, args.rho),
    modelIndex: modelIndexOf(args.model),
  };
}

export function mainStreamSeed(args: NoiseConfigSeedArgs, score: ScoreKind): number {
  return derivedSeed({ ...noiseConfigBase(args), substreamIndex: mainSubstream(score) });
}

export function reversalSeed(
  args: NoiseConfigSeedArgs,
  score: ScoreKind,
  k: number,
  replicate: "A" | "B",
): number {
  return derivedSeed({
    ...noiseConfigBase(args),
    substreamIndex: reversalSubstream(score, k, replicate),
  });
}

/** Return seeds that appear more than once in the supplied labeled list. */
export function findSeedCollisions(
  entries: ReadonlyArray<{ label: string; seed: number }>,
): Array<{ seed: number; labels: string[] }> {
  const bySeed = new Map<number, string[]>();
  for (const e of entries) {
    const list = bySeed.get(e.seed);
    if (list) list.push(e.label);
    else bySeed.set(e.seed, [e.label]);
  }
  const out: Array<{ seed: number; labels: string[] }> = [];
  for (const [seed, labels] of bySeed) {
    if (labels.length > 1) out.push({ seed, labels });
  }
  return out.sort((a, b) => a.seed - b.seed);
}

/** Enumerate all main-stream (substream 0/1) seeds for a noise protocol. */
export function enumerateMainStreamSeeds(
  protocolId: ProtocolId,
  personaCount = 12,
): Array<{ label: string; seed: number }> {
  const out: Array<{ label: string; seed: number }> = [];
  for (let p = 0; p < personaCount; p++) {
    for (const mult of SIGMA_MULTIPLIERS) {
      const configs: Array<{ model: ModelKind; rho: number | null }> = [{ model: "A", rho: null }];
      for (const rho of RHO_GRID) configs.push({ model: "B", rho });
      for (const c of configs) {
        for (const score of ["health", "perf"] as const) {
          const args: NoiseConfigSeedArgs = {
            protocolId,
            personaIndex: p,
            sigmaMultiplier: mult,
            model: c.model,
            rho: c.rho,
          };
          out.push({
            label: `${protocolId}|p${p}|s${mult}|${c.model}|${c.rho ?? "na"}|${score}`,
            seed: mainStreamSeed(args, score),
          });
        }
      }
    }
  }
  return out;
}
