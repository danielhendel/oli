# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 160000 | true | 1.0467 | 2.8956 | 0.4986 | 2.2495 |
| perf | 70.0000 | 400000 | true | 0.5800 | 2.2984 | 0.5002 | 1.0404 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8784, H2=0.1216, H3=-0.0001
- perf: P1=-0.0215, P3=1.0215

No product bands, no clinical claims. Synthetic fallback parameters only.
