# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 1
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.3934 | 1.1509 | 0.5014 | 0.3446 |
| perf | 51.0000 | 120000 | true | 0.0477 | 1.0228 | 0.0513 | 0.2474 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8385, H2=0.1607, H3=0.0008
- perf: P1=0.5900, P3=0.4100

No product bands, no clinical claims. Synthetic fallback parameters only.
