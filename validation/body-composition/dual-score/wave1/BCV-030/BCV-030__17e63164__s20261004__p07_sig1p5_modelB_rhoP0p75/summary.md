# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 1.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.6605 | 1.9230 | 0.4979 | 0.9610 |
| perf | 52.6377 | 120000 | true | 1.1694 | 3.4034 | 0.5003 | 3.0129 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6045, H2=-0.0507, H3=0.4462
- perf: P1=1.2197, P3=-0.2197

No product bands, no clinical claims. Synthetic fallback parameters only.
