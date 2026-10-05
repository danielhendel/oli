# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 0.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.1980 | 0.5730 | 0.5013 | 0.0858 |
| perf | 51.0000 | 120000 | true | 0.0010 | 0.4322 | 0.0008 | 0.0239 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8387, H2=0.1613, H3=0.0000
- perf: P1=0.0110, P3=0.9890

No product bands, no clinical claims. Synthetic fallback parameters only.
