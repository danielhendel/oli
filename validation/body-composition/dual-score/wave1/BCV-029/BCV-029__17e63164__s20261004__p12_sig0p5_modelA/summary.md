# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 0.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3566 | 1.0350 | 0.5025 | 0.2790 |
| perf | 45.1316 | 120000 | true | 0.5328 | 1.5540 | 0.4967 | 0.6180 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6541, H2=0.0438, H3=0.3021
- perf: P1=1.0516, P3=-0.0516

No product bands, no clinical claims. Synthetic fallback parameters only.
