# BCV-029 — Joint correlated measurement error propagation

- persona: P-06 (male), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.3814 | 120000 | true | 0.9135 | 2.6338 | 0.5014 | 1.8107 |
| perf | 85.5652 | 120000 | true | 1.4568 | 4.2552 | 0.5011 | 4.6333 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7010, H2=0.0000, H3=0.2990
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
