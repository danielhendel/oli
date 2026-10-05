# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 1
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.5580 | 1.5136 | 0.4990 | 0.6266 |
| perf | 70.0000 | 380000 | true | 0.2927 | 1.1955 | 0.5001 | 0.2749 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8861, H2=0.1139, H3=0.0000
- perf: P1=-0.0027, P3=1.0027

No product bands, no clinical claims. Synthetic fallback parameters only.
