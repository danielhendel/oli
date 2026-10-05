# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 140000 | true | 0.8106 | 2.2080 | 0.4984 | 1.3188 |
| perf | 70.0000 | 270000 | true | 0.4370 | 1.7618 | 0.4999 | 0.6060 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8810, H2=0.1190, H3=-0.0000
- perf: P1=-0.0082, P3=1.0082

No product bands, no clinical claims. Synthetic fallback parameters only.
