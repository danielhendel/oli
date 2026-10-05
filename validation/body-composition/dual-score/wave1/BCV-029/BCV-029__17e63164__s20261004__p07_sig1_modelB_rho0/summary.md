# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 1
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.4915 | 1.4196 | 0.5020 | 0.5269 |
| perf | 52.6377 | 120000 | true | 0.8689 | 2.5329 | 0.5027 | 1.6727 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4873, H2=0.0542, H3=0.4585
- perf: P1=1.0782, P3=-0.0782

No product bands, no clinical claims. Synthetic fallback parameters only.
