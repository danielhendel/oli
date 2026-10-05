# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.1162 | 3.2576 | 0.4959 | 2.7205 |
| perf | 22.8750 | 130000 | true | 0.9531 | 8.5766 | 0.3103 | 8.9233 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6796, H2=0.0896, H3=0.2308
- perf: P1=1.0441, P3=-0.0441

No product bands, no clinical claims. Synthetic fallback parameters only.
