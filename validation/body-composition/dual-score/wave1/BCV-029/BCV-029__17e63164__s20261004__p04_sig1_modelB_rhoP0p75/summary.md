# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 1
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 130000 | true | 0.5558 | 1.5041 | 0.4989 | 0.6203 |
| perf | 70.0000 | 140000 | true | 0.2924 | 1.1930 | 0.5002 | 0.2730 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8875, H2=0.1125, H3=0.0000
- perf: P1=-0.0057, P3=1.0057

No product bands, no clinical claims. Synthetic fallback parameters only.
