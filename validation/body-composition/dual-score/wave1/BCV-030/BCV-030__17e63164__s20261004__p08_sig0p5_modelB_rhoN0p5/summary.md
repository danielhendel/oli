# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 0.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2845 | 0.8258 | 0.4999 | 0.1778 |
| perf | 22.8750 | 120000 | true | 0.2422 | 2.1931 | 0.3627 | 0.6083 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6260, H2=0.0348, H3=0.3392
- perf: P1=0.9914, P3=0.0086

No product bands, no clinical claims. Synthetic fallback parameters only.
