# BCV-029 — Joint correlated measurement error propagation

- persona: P-09 (male), sigma multiplier: 0.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 0.2936 | 0.8561 | 0.5007 | 0.1900 |
| perf | 89.5833 | 150000 | true | 0.2210 | 0.6414 | 0.4999 | 0.1074 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7943, H2=0.2057, H3=0.0000
- perf: P1=0.0000, P3=1.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
