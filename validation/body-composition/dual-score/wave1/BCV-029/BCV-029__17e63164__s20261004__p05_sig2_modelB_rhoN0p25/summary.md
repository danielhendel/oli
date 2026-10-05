# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8017 | 2.3447 | 0.5006 | 1.4269 |
| perf | 51.0000 | 170000 | true | 0.3022 | 4.3865 | 0.1603 | 3.5823 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8030, H2=0.1600, H3=0.0370
- perf: P1=0.8978, P3=0.1022

No product bands, no clinical claims. Synthetic fallback parameters only.
