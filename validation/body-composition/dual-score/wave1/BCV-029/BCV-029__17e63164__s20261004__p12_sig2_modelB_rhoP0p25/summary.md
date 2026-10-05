# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 190000 | true | 1.3987 | 4.0304 | 0.5013 | 4.2607 |
| perf | 45.1316 | 120000 | true | 2.1412 | 7.5941 | 0.4982 | 13.6220 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6472, H2=0.0386, H3=0.3142
- perf: P1=1.1087, P3=-0.1087

No product bands, no clinical claims. Synthetic fallback parameters only.
