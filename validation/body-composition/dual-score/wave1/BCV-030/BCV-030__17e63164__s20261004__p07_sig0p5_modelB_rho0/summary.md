# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 0.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.2453 | 0.7091 | 0.4992 | 0.1316 |
| perf | 52.6377 | 120000 | true | 0.4356 | 1.2648 | 0.5015 | 0.4165 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4835, H2=0.0541, H3=0.4624
- perf: P1=1.0781, P3=-0.0781

No product bands, no clinical claims. Synthetic fallback parameters only.
