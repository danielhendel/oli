# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8022 | 2.3341 | 0.5002 | 1.4184 |
| perf | 51.0000 | 130000 | true | 0.3468 | 4.4875 | 0.1690 | 3.7717 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8051, H2=0.1594, H3=0.0355
- perf: P1=0.8774, P3=0.1226

No product bands, no clinical claims. Synthetic fallback parameters only.
