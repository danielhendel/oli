# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8028 | 2.3391 | 0.5000 | 1.4212 |
| perf | 51.0000 | 140000 | true | 0.3983 | 4.6520 | 0.1789 | 3.9505 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8019, H2=0.1602, H3=0.0379
- perf: P1=0.8633, P3=0.1367

No product bands, no clinical claims. Synthetic fallback parameters only.
