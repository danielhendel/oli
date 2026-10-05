# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.5947 | 1.7350 | 0.5008 | 0.7789 |
| perf | 51.0000 | 140000 | true | 0.1781 | 2.3890 | 0.1227 | 1.4014 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8271, H2=0.1603, H3=0.0126
- perf: P1=0.8228, P3=0.1772

No product bands, no clinical claims. Synthetic fallback parameters only.
