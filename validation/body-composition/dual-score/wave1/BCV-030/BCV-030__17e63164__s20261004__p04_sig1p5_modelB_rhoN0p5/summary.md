# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 130000 | true | 0.8087 | 2.2150 | 0.4987 | 1.3203 |
| perf | 70.0000 | 270000 | true | 0.4391 | 1.7735 | 0.4998 | 0.6114 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8822, H2=0.1178, H3=0.0000
- perf: P1=-0.0039, P3=1.0039

No product bands, no clinical claims. Synthetic fallback parameters only.
