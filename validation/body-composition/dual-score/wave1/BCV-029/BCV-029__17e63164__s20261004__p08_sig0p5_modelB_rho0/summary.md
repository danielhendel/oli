# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 0.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2946 | 0.8557 | 0.5014 | 0.1907 |
| perf | 22.8750 | 120000 | true | 0.2399 | 2.1115 | 0.3134 | 0.5455 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5811, H2=0.0669, H3=0.3520
- perf: P1=1.0430, P3=-0.0430

No product bands, no clinical claims. Synthetic fallback parameters only.
