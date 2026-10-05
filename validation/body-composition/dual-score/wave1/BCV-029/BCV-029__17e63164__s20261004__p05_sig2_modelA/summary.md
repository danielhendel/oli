# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 2
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8045 | 2.3402 | 0.5002 | 1.4208 |
| perf | 51.0000 | 120000 | true | 0.3410 | 4.4729 | 0.1690 | 3.7191 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8053, H2=0.1592, H3=0.0356
- perf: P1=0.8767, P3=0.1233

No product bands, no clinical claims. Synthetic fallback parameters only.
