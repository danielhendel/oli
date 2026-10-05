# BCV-029 — Joint correlated measurement error propagation

- persona: P-09 (male), sigma multiplier: 2
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 1.1756 | 3.4146 | 0.5007 | 3.0353 |
| perf | 89.5833 | 330000 | true | 0.8826 | 2.5435 | 0.4999 | 1.6873 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7936, H2=0.2064, H3=0.0000
- perf: P1=-0.0068, P3=1.0068

No product bands, no clinical claims. Synthetic fallback parameters only.
