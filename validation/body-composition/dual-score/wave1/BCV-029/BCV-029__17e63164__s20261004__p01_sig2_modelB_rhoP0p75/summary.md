# BCV-029 — Joint correlated measurement error propagation

- persona: P-01 (male), sigma multiplier: 2
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 92.1618 | 120000 | true | 0.7037 | 2.0474 | 0.5007 | 1.0895 |
| perf | 91.0000 | 170000 | true | 0.6131 | 4.6798 | 0.4995 | 3.2394 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.9705, H2=0.0000, H3=0.0295
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
