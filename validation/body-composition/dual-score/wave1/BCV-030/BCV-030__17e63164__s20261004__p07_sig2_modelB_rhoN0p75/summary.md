# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.8809 | 2.5599 | 0.4975 | 1.7026 |
| perf | 52.6377 | 140000 | true | 1.9092 | 5.5425 | 0.5001 | 7.9541 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6024, H2=-0.0495, H3=0.4471
- perf: P1=0.9830, P3=0.0170

No product bands, no clinical claims. Synthetic fallback parameters only.
