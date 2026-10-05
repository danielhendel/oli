# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 1.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.8122 | 2.3842 | 0.4994 | 1.4591 |
| perf | 22.8750 | 120000 | true | 0.7158 | 6.1722 | 0.2380 | 4.4957 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6988, H2=0.0566, H3=0.2446
- perf: P1=1.1099, P3=-0.1099

No product bands, no clinical claims. Synthetic fallback parameters only.
