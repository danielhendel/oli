# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 1
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.6925 | 2.0179 | 0.5010 | 1.0592 |
| perf | 45.1316 | 120000 | true | 1.1653 | 3.6290 | 0.4970 | 3.3004 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6830, H2=0.0215, H3=0.2955
- perf: P1=0.9682, P3=0.0318

No product bands, no clinical claims. Synthetic fallback parameters only.
