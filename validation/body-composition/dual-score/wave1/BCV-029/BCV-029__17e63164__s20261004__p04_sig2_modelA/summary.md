# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 2
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 1.0511 | 2.9072 | 0.4997 | 2.2576 |
| perf | 70.0000 | 350000 | true | 0.5785 | 2.3032 | 0.5002 | 1.0451 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8790, H2=0.1210, H3=-0.0000
- perf: P1=-0.0218, P3=1.0218

No product bands, no clinical claims. Synthetic fallback parameters only.
