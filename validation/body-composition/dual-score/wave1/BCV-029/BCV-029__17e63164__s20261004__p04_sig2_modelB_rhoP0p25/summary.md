# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 180000 | true | 1.0513 | 2.9117 | 0.4979 | 2.2658 |
| perf | 70.0000 | 220000 | true | 0.5763 | 2.2734 | 0.5001 | 1.0194 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8775, H2=0.1226, H3=-0.0000
- perf: P1=-0.0313, P3=1.0313

No product bands, no clinical claims. Synthetic fallback parameters only.
