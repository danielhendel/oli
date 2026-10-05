# BCV-030 — Aggregate uncertainty propagation

- persona: P-03 (male), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 77.8000 | 130000 | true | 0.9534 | 2.7109 | 0.4994 | 1.9388 |
| perf | 55.2857 | 150000 | true | 3.4282 | 8.5045 | 0.4996 | 17.8109 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4818, H2=0.0000, H3=0.5182
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
