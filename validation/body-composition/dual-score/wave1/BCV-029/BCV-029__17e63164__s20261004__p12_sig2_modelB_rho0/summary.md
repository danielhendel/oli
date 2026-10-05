# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 210000 | true | 1.4159 | 4.0605 | 0.5018 | 4.3337 |
| perf | 45.1316 | 120000 | true | 2.2446 | 7.8850 | 0.4970 | 14.8378 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6399, H2=0.0439, H3=0.3162
- perf: P1=1.0570, P3=-0.0570

No product bands, no clinical claims. Synthetic fallback parameters only.
