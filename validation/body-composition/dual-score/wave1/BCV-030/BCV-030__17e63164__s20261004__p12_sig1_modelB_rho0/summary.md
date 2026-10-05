# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 1
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.7114 | 2.0605 | 0.4992 | 1.1068 |
| perf | 45.1316 | 120000 | true | 1.0646 | 3.3359 | 0.4983 | 2.7796 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6535, H2=0.0434, H3=0.3031
- perf: P1=1.0554, P3=-0.0554

No product bands, no clinical claims. Synthetic fallback parameters only.
