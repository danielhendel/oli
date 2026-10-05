# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.8077 | 2.2063 | 0.4990 | 1.3156 |
| perf | 70.0000 | 330000 | true | 0.4383 | 1.7354 | 0.4996 | 0.5863 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8822, H2=0.1178, H3=-0.0000
- perf: P1=-0.0272, P3=1.0272

No product bands, no clinical claims. Synthetic fallback parameters only.
