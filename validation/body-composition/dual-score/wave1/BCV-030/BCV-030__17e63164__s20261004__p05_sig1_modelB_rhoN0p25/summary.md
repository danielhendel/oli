# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 1
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.3942 | 1.1494 | 0.4989 | 0.3439 |
| perf | 51.0000 | 120000 | true | 0.0374 | 1.0017 | 0.0481 | 0.2421 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8401, H2=0.1591, H3=0.0008
- perf: P1=0.6108, P3=0.3892

No product bands, no clinical claims. Synthetic fallback parameters only.
