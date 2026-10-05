# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 1.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 160000 | true | 1.0121 | 2.9017 | 0.5002 | 2.2104 |
| perf | 45.1316 | 120000 | true | 1.3368 | 4.8568 | 0.4976 | 5.5060 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7236, H2=-0.0099, H3=0.2863
- perf: P1=1.2553, P3=-0.2553

No product bands, no clinical claims. Synthetic fallback parameters only.
