# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 1
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.3948 | 1.1502 | 0.5014 | 0.3447 |
| perf | 51.0000 | 120000 | true | 0.0574 | 1.0284 | 0.0546 | 0.2546 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8382, H2=0.1609, H3=0.0009
- perf: P1=0.5882, P3=0.4118

No product bands, no clinical claims. Synthetic fallback parameters only.
