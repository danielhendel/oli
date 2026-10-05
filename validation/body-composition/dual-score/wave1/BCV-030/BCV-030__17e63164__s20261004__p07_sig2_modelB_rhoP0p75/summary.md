# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.8809 | 2.5444 | 0.4980 | 1.6960 |
| perf | 52.6377 | 150000 | true | 1.5664 | 4.5346 | 0.4999 | 5.3714 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6050, H2=-0.0512, H3=0.4462
- perf: P1=1.2192, P3=-0.2192

No product bands, no clinical claims. Synthetic fallback parameters only.
