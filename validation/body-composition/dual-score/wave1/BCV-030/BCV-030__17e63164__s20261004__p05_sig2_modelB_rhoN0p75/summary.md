# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8088 | 2.3836 | 0.4981 | 1.4774 |
| perf | 51.0000 | 130000 | true | 0.1804 | 4.0250 | 0.1427 | 3.0414 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7723, H2=0.1736, H3=0.0541
- perf: P1=0.9641, P3=0.0359

No product bands, no clinical claims. Synthetic fallback parameters only.
