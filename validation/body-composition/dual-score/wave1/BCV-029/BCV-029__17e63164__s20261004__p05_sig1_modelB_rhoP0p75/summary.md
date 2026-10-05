# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 1
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.3973 | 1.1570 | 0.5016 | 0.3480 |
| perf | 51.0000 | 120000 | true | 0.0719 | 1.0355 | 0.0581 | 0.2641 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8374, H2=0.1606, H3=0.0020
- perf: P1=0.5876, P3=0.4124

No product bands, no clinical claims. Synthetic fallback parameters only.
