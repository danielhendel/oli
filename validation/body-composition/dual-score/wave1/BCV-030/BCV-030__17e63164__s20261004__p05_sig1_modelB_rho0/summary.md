# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 1
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.3949 | 1.1472 | 0.4988 | 0.3425 |
| perf | 51.0000 | 120000 | true | 0.0501 | 1.0290 | 0.0507 | 0.2548 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8367, H2=0.1626, H3=0.0006
- perf: P1=0.5973, P3=0.4027

No product bands, no clinical claims. Synthetic fallback parameters only.
