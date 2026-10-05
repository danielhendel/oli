# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 0.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.1974 | 0.5707 | 0.5013 | 0.0852 |
| perf | 51.0000 | 120000 | true | 0.0000 | 0.4383 | 0.0009 | 0.0241 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8396, H2=0.1604, H3=0.0000
- perf: P1=0.0065, P3=0.9935

No product bands, no clinical claims. Synthetic fallback parameters only.
