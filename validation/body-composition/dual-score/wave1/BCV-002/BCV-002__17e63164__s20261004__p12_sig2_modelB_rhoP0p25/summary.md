# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 200000 | true | 1.4011 | 4.0389 | 0.4989 | 4.2756 |
| perf | 45.1316 | 120000 | true | 2.1338 | 7.5579 | 0.4924 | 13.5351 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6504, H2=0.0386, H3=0.3109
- perf: P1=1.1092, P3=-0.1092

No product bands, no clinical claims. Synthetic fallback parameters only.
