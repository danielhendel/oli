# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.6000 | 1.7496 | 0.4987 | 0.7932 |
| perf | 51.0000 | 120000 | true | 0.0799 | 2.0537 | 0.1040 | 1.0769 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8115, H2=0.1674, H3=0.0211
- perf: P1=0.9004, P3=0.0996

No product bands, no clinical claims. Synthetic fallback parameters only.
