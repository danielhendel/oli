# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 1
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.5547 | 1.5047 | 0.4995 | 0.6195 |
| perf | 70.0000 | 340000 | true | 0.2929 | 1.1944 | 0.5003 | 0.2750 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8865, H2=0.1135, H3=0.0000
- perf: P1=-0.0028, P3=1.0028

No product bands, no clinical claims. Synthetic fallback parameters only.
