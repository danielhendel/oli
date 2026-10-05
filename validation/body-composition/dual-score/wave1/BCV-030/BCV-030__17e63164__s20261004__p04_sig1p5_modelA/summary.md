# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 1.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.8097 | 2.1994 | 0.4990 | 1.3155 |
| perf | 70.0000 | 170000 | true | 0.4362 | 1.7544 | 0.5005 | 0.6007 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8813, H2=0.1187, H3=-0.0000
- perf: P1=-0.0127, P3=1.0127

No product bands, no clinical claims. Synthetic fallback parameters only.
