# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.9298 | 2.7134 | 0.4998 | 1.9026 |
| perf | 52.6377 | 140000 | true | 1.8330 | 5.3790 | 0.5004 | 7.4684 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5350, H2=0.0140, H3=0.4511
- perf: P1=1.0123, P3=-0.0123

No product bands, no clinical claims. Synthetic fallback parameters only.
