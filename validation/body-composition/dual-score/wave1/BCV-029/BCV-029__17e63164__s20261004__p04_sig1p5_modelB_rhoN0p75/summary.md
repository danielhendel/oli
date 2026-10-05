# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 160000 | true | 0.8091 | 2.2129 | 0.4985 | 1.3214 |
| perf | 70.0000 | 360000 | true | 0.4402 | 1.7755 | 0.5005 | 0.6154 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8814, H2=0.1186, H3=-0.0000
- perf: P1=-0.0003, P3=1.0003

No product bands, no clinical claims. Synthetic fallback parameters only.
