# Body Composition Dual Score — Wave 1 synthetic validation harness: implementation spec

Validation-only code. Synthetic data only (`phiStatus = synthetic_no_phi`). No `Math.random()`.
Imports the approved score engine, transforms and Resolver **read-only**; it never modifies
`lib/contracts/bodyCompositionScores.ts`, `lib/data/body/evidence/scoring/`, the Resolver, Confidence, UI or API.

Plan reference: `docs/10_product/specs/BODY_COMPOSITION_DUAL_SCORE_PRIVATE_VALIDATION_PLAN_V1.md` §23, §23.17.

## 1. Frozen identity

| item | value |
|---|---|
| implementationSha | `d940b1616b341e98b19e82f2cd6a6242dfe41691` |
| mathematicalFreezeSha | `e258267d109d1d05e20270f205e5fdb29ae2aca6` |
| validationPlanSha | `4900f6e56f1eb83799513452cc4b5d2dcc20601d` |
| engines | `body_composition_health_score_draft_v1`, `body_composition_performance_supporting_score_draft_v1` |
| asOf | `2026-10-04T12:00:00.000Z` |
| canonicalSeed | `20261004` |
| EPS_NUM / EPS_SURF / EPS_CM | `1e-9` / `1e-4` / `1e-3` |

`runAll` ALWAYS (including `--dry-run`) calls `assertScoringModuleMatchesImplementationSha`:
`git cat-file -e <sha>^{commit}`, `git diff --name-only <sha> -- <guarded paths>` and
`git ls-files --others` over the guarded paths (scoring dir, resolver dir, `formulas.ts`, `metricRegistry.ts`,
the three body-composition contracts). Any difference → `ScoringIdentityError`, exit code 1.

## 2. Run ID convention

```
runId = ${protocolId}__${validationCodeShaShort8}__s${seed}__${paramSetId}
```

- `validationCodeShaShort8` = first 8 hex chars of `git rev-parse HEAD` (`validationCodeSha`).
- `seed` is the canonical seed (`20261004`).
- `paramSetId` ∈ `[A-Za-z0-9_]+`. Examples: `struct` (deterministic/structural protocols), `grid_male` / `grid_female` (BCV-001),
  `p01_sig1_modelA`, `p01_sig1_modelB_rho0`, `p12_sig2_modelB_rhoN0p75` (MC: persona, sigma multiplier, model, rho).
  Sigma labels `sig0p5 sig1 sig1p5 sig2`; rho labels `rho0`, `rhoP0p25`, `rhoN0p75`.
- `createdAtUtc` is **never** part of the runId (informational manifest field only). Re-running the same code with the same
  seed produces the same runId / directory (artifacts are overwritten in place).
- `experimentId = protocolId`. Artifact root: `validation/body-composition/dual-score/wave1/<experiment-id>/<run-id>/`.
- Because the SHA is `HEAD`, the runner refuses a real run when the validation tree is dirty unless `--allow-dirty`
  (then `validationCodeSha` does not describe the code that ran). Dry-run only warns.

## 3. Date-of-birth convention

For a completed age `N` at asOf: `dateOfBirth = ${2026 - N}-10-04` (age 30 → `1996-10-04`). Used by every bundle builder.

## 4. Randomness

- `mulberry32` exact; `u = (x + 0.5) / 4294967296` (open interval).
- Marsaglia polar: `z1` returned first, `z2` cached and consumed before any new uniforms; `reset()` after reseeding.
- Draw order per observation: Height, FM, FFM, ALM, Waist (5 normals, both models).
- `derivedSeed = canonicalSeed + streamCode·1e6 + personaIndex·1e4 + sigmaIndex·1e3 + rhoIndex·100 + modelIndex·10 + substreamIndex`
  (integer arithmetic; Model A: rhoIndex 0, modelIndex 0; Model B: rhoIndex = position in the ρ grid, modelIndex 1).
  Stream codes: BCV-001=1 … BCV-032A=3201, BCV-034=34 (`constants.ts`).
- Main streams: Health substream 0, Performance substream 1. Reversal replicates: `scoreBase + 2k` / `scoreBase + 2k + 1`
  (Health 100, Performance 200).
- **Known formula property (documented, not "fixed")**: `scoreBase + 2k+1` can exceed the 10 000-wide persona digit for
  k ≥ ~4950, so reversal seeds of *different* configurations in the same protocol may coincide (`streams.ts` header,
  `findSeedCollisions`). Within one configuration all A/B seeds are distinct and main-stream seeds are collision-free
  (tested for BCV-002/029/030).

## 5. Statistics

Hyndman–Fan Type 7; batch means with 20 batches, sample SD (divisor 19), `SE = sd/√20`; MC min 1e5, max 1e6,
checkpoint every 1e4, two consecutive passing checkpoints; tolerances `tol_median .01 tol_p95 .02 se_tol_median .02
se_tol_p95 .05 tol_rate .001 se_tol_rate .001`; monitored: median |Δ|, p95 |Δ|, threshold-crossing rates at 10…90.

Interpretation (documented choice): the checkpoint at `minimumDraws` is the **reference estimate**; passes are counted
from `minimumDraws + checkpointEvery` onward, each compared with the immediately preceding checkpoint (no moving average).
Health and Performance streams converge independently. Threshold crossing = baseline S0 and noisy score on opposite
sides of T (`>= T` counts as above).

## 6. Models

- Model A: independent FM / FFM / ALM errors, shared Height error, independent Waist. **Not** Model B at ρ=0 — a
  separate code path and a separate stream (`modelIndex`).
- Model B: `z_FFM = ρ z_FM + √(1−ρ²) z_FFM_ind`, `z_ALM = ρ z_FFM + √(1−ρ²) z_ALM_ind`; expected
  `corr(FM,FFM)=corr(FFM,ALM)=ρ`, `corr(FM,ALM)=ρ²` (documented in every MC artifact).
- σ\*: Waist 1.0 cm, Height 0.5 cm, FM 0.25, FFM 0.25, ALM 0.20 kg; multipliers 0.5/1/1.5/2; ρ grid −0.75…0.75 step 0.25.
  All labelled `exploratory_normalized_not_empirical`, provenance `synthetic_fallback`.
- One shared Height error per draw is propagated to WHtR, FMI, FFMI and ALMI.
- MC baseline for a persona uses table Waist/Height (WHtR = Waist/Height, e.g. 78/178 for P-01). Engine-bundle protocols
  (BCV-017/016/…) use the table WHtR (waist = WHtR × height). The two differ by < 5e-4 in WHtR for P-01.

## 7. Contribution, reversal, uncertainty, false improvement

Implemented in `contribution.ts` / `acute.ts` exactly per §23.17.1/2/3/8 (weights Health .45/.35/.20, Performance .5/.5;
`dominantAdverseConstruct` ties → earliest in declared order; reversal indicator 0 on any exact zero delta;
uncertainty share = signed, unclipped, `null` + flag `aggregate_variance_near_zero` when Var(A) ≤ EPS_NUM, sample moments N−1).
BCV-034 `falseImprovementRate` excludes the BASE scenario (BASE vs BASE is identically 0); unavailable counts are separate.

## 8. Scoring layers

- `scoringPure.ts`: approved transforms imported directly (MC, surfaces, sensitivity, BCV-018/034).
- `scoringBundle.ts`: full `BodyCompositionEvidenceBundle` (both ALMI and FFMI) → real Resolver → both score engines
  (BCV-006/007/015/016/017/031). Calculated WHtR takes the Waist time; DXA indices take the DXA time.

### Resolver findings (reported, not fixed)

1. **P1 is `policy_not_frozen` for every realistic bundle.** If an FFMI observation and the FFM it was calculated from are
   both present, the Resolver reports P1 (and FFMI-primary H3) as `policy_not_frozen` (unfrozen FFMI/FFM channel
   precedence), so Performance-Supporting is unavailable. Structural/fairness protocols need a scoring baseline, so
   `normalizeP1Resolution` (and the BCV-015 `normalizeBaseline`) rewrite P1 to `resolved` on the governed FFMI channel
   **only** when P1 is `policy_not_frozen` and the FFMI channel itself is resolved. Always recorded
   (`p1Normalized`, `baselineNormalization`, manifest notes).
2. The Resolver never emits `conflict`, `unsupported`, or (for same-value duplicates) `multiple_valid`. BCV-015 therefore
   executes `status_only` / `resolve_then_mutate` modes for those fixtures and records every deviation per row
   (`resolverStatusObservedNatural`, `resolverStatusPatched`, `resolverStatusPatchReason`).

## 9. Protocol notes

| BCV | run(s) | notes |
|---|---|---|
| 001 | `grid_male`, `grid_female` | 1D sweeps (coarse + dense-local + knots + knot±EPS_NUM/EPS_SURF) and six 2D surfaces over `canonicalAxisGrid(x) × canonicalAxisGrid(y)`; json+csv+md (+optional SVG with `--plots`) |
| 002 / 029 / 030 | 384 each | 12 personas × 4 σ × (Model A + Model B × 7 ρ); one config at a time; summaries only. Reversal pairs are run in all three (BCV-032A needs SD(delta)) |
| 006 | `struct` | ages 20/40/60/80 × sex anchors; |Δ| ≤ EPS_NUM |
| 007 | `struct` | sex anchors; same raw inputs evaluated under both sex transforms; not assumed fair |
| 012 | `struct` | OAT central differences at the frozen steps, joint (±,±) EPS_SURF finite differences over six surfaces, normalized sensitivity = \|slope\|·DOMAIN_RANGE |
| 013 | `struct` | `discontinuityDelta = max(\|f(k)−f(k−ε)\|, \|f(k+ε)−f(k)\|)` at ε=EPS_NUM (one-sided jumps; across-knot delta also reported); invariant ≤ 1e-6 |
| 014 | `struct` | occupancy over coarse grids (1D constructs and 2D aggregates) |
| 015 | `struct` | 81 families × {P-01, P-11} = 162 rows (160 executed + 2 `H1_MISSING_SEX` not_applicable) |
| 016 | `struct` | S-01…S-15 compared with an independent oracle of the 180 d input-age / 90 d era-gap rules |
| 017 | `struct` | §23.17.7 predicate against engine scores at the §23.5.4 reference |
| 018 | `struct` | companion-anchor single/dual adverse combos + personas, §23.17.1 fields, adverse-hide |
| 031 | `struct` | HARD FAIL (exit 1) on hidden-path dependence; labels attached to bundle / subjectContext / observations |
| 032A | `struct` | §23.17.6 formulas from BCV-030/029 `results.json` on disk; run after them; group-level SDC, clinical and user-perceived change NOT computed |
| 034 | `struct` | frozen scenario matrix on P-01/P-08/P-11/P-12; menstrual scenarios female only |

## 10. Running

```
# tests (Jest picks up validation/**/tests/*.test.ts)
npx jest validation/body-composition

# plan only (identity assertion still runs; no compute, no writes)
npx tsx --tsconfig validation/body-composition/dual-score/wave1/tsconfig.json \
  validation/body-composition/dual-score/wave1/src/runAll.ts --dry-run

# full execution (heavy: BCV-002/029/030 are 3 × 384 Monte Carlo runs)
npm run validate:body-composition:wave1
```

Options: `--protocols`, `--out`, `--plots`, `--personas`, `--sigmas`, `--models`, `--rhos`, `--smoke-mc`, `--allow-dirty`.
Filters / `--smoke-mc` produce runs marked PARTIAL in the manifest notes and are not the frozen protocol.
`tsx` needs to create an IPC pipe; in restricted sandboxes it may fail with `listen EPERM`.
