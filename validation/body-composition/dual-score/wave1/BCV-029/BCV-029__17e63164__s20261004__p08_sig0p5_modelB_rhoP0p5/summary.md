# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 0.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2839 | 0.8226 | 0.5019 | 0.1768 |
| perf | 22.8750 | 120000 | true | 0.2378 | 2.0302 | 0.2379 | 0.4858 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6255, H2=0.0344, H3=0.3401
- perf: P1=1.1107, P3=-0.1107

No product bands, no clinical claims. Synthetic fallback parameters only.
