# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 1.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.8339 | 2.4404 | 0.4979 | 1.5371 |
| perf | 22.8750 | 120000 | true | 0.7210 | 6.4739 | 0.3388 | 5.2605 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6618, H2=0.0786, H3=0.2596
- perf: P1=1.0165, P3=-0.0165

No product bands, no clinical claims. Synthetic fallback parameters only.
