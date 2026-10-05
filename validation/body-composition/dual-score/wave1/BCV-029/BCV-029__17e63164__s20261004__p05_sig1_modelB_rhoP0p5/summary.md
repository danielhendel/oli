# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 1
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.3959 | 1.1539 | 0.5014 | 0.3457 |
| perf | 51.0000 | 120000 | true | 0.0664 | 1.0410 | 0.0573 | 0.2666 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8352, H2=0.1635, H3=0.0013
- perf: P1=0.5927, P3=0.4073

No product bands, no clinical claims. Synthetic fallback parameters only.
