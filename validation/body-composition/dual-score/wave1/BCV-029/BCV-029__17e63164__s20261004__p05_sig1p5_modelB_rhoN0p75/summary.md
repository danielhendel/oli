# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.6004 | 1.7503 | 0.5010 | 0.7985 |
| perf | 51.0000 | 120000 | true | 0.0810 | 2.0726 | 0.1022 | 1.0814 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8131, H2=0.1663, H3=0.0206
- perf: P1=0.9027, P3=0.0973

No product bands, no clinical claims. Synthetic fallback parameters only.
