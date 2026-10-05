# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 1
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.4404 | 1.2811 | 0.4975 | 0.4272 |
| perf | 52.6377 | 120000 | true | 0.9546 | 2.7635 | 0.4999 | 1.9986 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6048, H2=-0.0500, H3=0.4452
- perf: P1=0.9833, P3=0.0167

No product bands, no clinical claims. Synthetic fallback parameters only.
