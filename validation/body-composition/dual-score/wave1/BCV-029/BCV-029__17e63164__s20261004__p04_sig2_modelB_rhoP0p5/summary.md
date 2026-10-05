# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 160000 | true | 1.0497 | 2.9159 | 0.4985 | 2.2609 |
| perf | 70.0000 | 190000 | true | 0.5769 | 2.2601 | 0.5001 | 1.0074 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8775, H2=0.1225, H3=-0.0001
- perf: P1=-0.0411, P3=1.0411

No product bands, no clinical claims. Synthetic fallback parameters only.
