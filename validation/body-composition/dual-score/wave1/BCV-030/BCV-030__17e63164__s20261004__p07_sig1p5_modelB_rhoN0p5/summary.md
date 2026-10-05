# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 1.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.7009 | 2.0470 | 0.4998 | 1.0885 |
| perf | 52.6377 | 120000 | true | 1.3894 | 4.0359 | 0.4996 | 4.2544 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5322, H2=0.0140, H3=0.4538
- perf: P1=1.0113, P3=-0.0113

No product bands, no clinical claims. Synthetic fallback parameters only.
