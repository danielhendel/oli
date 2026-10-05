# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.5951 | 1.7310 | 0.4984 | 0.7812 |
| perf | 51.0000 | 120000 | true | 0.2044 | 2.4293 | 0.1281 | 1.4262 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8256, H2=0.1620, H3=0.0124
- perf: P1=0.8077, P3=0.1923

No product bands, no clinical claims. Synthetic fallback parameters only.
