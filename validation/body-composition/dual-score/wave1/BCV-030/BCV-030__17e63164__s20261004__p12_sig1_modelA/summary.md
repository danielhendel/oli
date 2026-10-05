# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 1
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.7150 | 2.0641 | 0.4992 | 1.1161 |
| perf | 45.1316 | 120000 | true | 1.0639 | 3.3394 | 0.4982 | 2.8093 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6514, H2=0.0435, H3=0.3051
- perf: P1=1.0558, P3=-0.0558

No product bands, no clinical claims. Synthetic fallback parameters only.
