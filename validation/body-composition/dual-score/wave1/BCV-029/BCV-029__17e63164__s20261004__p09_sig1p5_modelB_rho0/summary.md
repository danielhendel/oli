# BCV-029 — Joint correlated measurement error propagation

- persona: P-09 (male), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 0.8819 | 2.5560 | 0.5007 | 1.6994 |
| perf | 89.5833 | 240000 | true | 0.6620 | 1.9284 | 0.4998 | 0.9650 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7930, H2=0.2070, H3=0.0000
- perf: P1=-0.0007, P3=1.0007

No product bands, no clinical claims. Synthetic fallback parameters only.
