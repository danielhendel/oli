# BCV-029 — Joint correlated measurement error propagation

- persona: P-09 (male), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 1.1836 | 3.4313 | 0.5007 | 3.0634 |
| perf | 89.5833 | 220000 | true | 0.8817 | 2.5515 | 0.4995 | 1.6908 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7932, H2=0.2068, H3=0.0000
- perf: P1=-0.0054, P3=1.0054

No product bands, no clinical claims. Synthetic fallback parameters only.
