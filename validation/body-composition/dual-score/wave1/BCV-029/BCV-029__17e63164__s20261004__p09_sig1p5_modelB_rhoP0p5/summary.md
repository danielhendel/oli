# BCV-029 — Joint correlated measurement error propagation

- persona: P-09 (male), sigma multiplier: 1.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 0.8861 | 2.5692 | 0.5007 | 1.7176 |
| perf | 89.5833 | 260000 | true | 0.6626 | 1.9206 | 0.4997 | 0.9635 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7957, H2=0.2043, H3=0.0000
- perf: P1=-0.0012, P3=1.0012

No product bands, no clinical claims. Synthetic fallback parameters only.
