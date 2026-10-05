# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 1
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.5534 | 1.5028 | 0.4995 | 0.6200 |
| perf | 70.0000 | 180000 | true | 0.2936 | 1.1888 | 0.5004 | 0.2737 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8869, H2=0.1131, H3=0.0000
- perf: P1=-0.0046, P3=1.0046

No product bands, no clinical claims. Synthetic fallback parameters only.
