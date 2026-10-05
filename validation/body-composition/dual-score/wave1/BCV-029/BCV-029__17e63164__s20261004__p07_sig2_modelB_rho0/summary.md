# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.9791 | 2.8393 | 0.5018 | 2.0982 |
| perf | 52.6377 | 140000 | true | 1.7452 | 5.0587 | 0.5027 | 6.6567 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4892, H2=0.0562, H3=0.4546
- perf: P1=1.0780, P3=-0.0780

No product bands, no clinical claims. Synthetic fallback parameters only.
