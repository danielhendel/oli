# BCV-029 — Joint correlated measurement error propagation

- persona: P-09 (male), sigma multiplier: 2
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 1.1862 | 3.4251 | 0.5007 | 3.0615 |
| perf | 89.5833 | 200000 | true | 0.8853 | 2.5575 | 0.4996 | 1.7050 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7956, H2=0.2044, H3=0.0000
- perf: P1=-0.0019, P3=1.0019

No product bands, no clinical claims. Synthetic fallback parameters only.
