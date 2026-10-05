# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 0.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3359 | 0.9796 | 0.4988 | 0.2489 |
| perf | 45.1316 | 120000 | true | 0.5973 | 1.7547 | 0.4969 | 0.7873 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7275, H2=-0.0100, H3=0.2825
- perf: P1=0.9259, P3=0.0741

No product bands, no clinical claims. Synthetic fallback parameters only.
