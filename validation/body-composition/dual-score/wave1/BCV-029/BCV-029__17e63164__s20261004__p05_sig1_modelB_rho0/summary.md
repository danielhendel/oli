# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 1
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.3969 | 1.1559 | 0.5014 | 0.3462 |
| perf | 51.0000 | 120000 | true | 0.0487 | 1.0168 | 0.0512 | 0.2423 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8414, H2=0.1578, H3=0.0008
- perf: P1=0.5845, P3=0.4155

No product bands, no clinical claims. Synthetic fallback parameters only.
