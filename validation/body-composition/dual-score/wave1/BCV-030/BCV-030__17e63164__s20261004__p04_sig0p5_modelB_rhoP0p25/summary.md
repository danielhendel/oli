# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 0.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.2797 | 0.8063 | 0.4989 | 0.1687 |
| perf | 70.0000 | 380000 | true | 0.1462 | 0.6009 | 0.5001 | 0.0692 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8948, H2=0.1052, H3=0.0000
- perf: P1=-0.0000, P3=1.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
