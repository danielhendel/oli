# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 1.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.5973 | 1.7355 | 0.5008 | 0.7826 |
| perf | 51.0000 | 120000 | true | 0.1740 | 2.3513 | 0.1224 | 1.3608 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8274, H2=0.1603, H3=0.0122
- perf: P1=0.8200, P3=0.1800

No product bands, no clinical claims. Synthetic fallback parameters only.
