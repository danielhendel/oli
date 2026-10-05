# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 1
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.5519 | 1.5036 | 0.4994 | 0.6171 |
| perf | 70.0000 | 330000 | true | 0.2923 | 1.1921 | 0.5001 | 0.2752 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8862, H2=0.1138, H3=0.0000
- perf: P1=-0.0020, P3=1.0020

No product bands, no clinical claims. Synthetic fallback parameters only.
