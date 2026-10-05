# BCV-029 — Joint correlated measurement error propagation

- persona: P-10 (male), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 76.0742 | 120000 | true | 0.9034 | 2.6261 | 0.5014 | 1.7971 |
| perf | 80.1304 | 270000 | true | 1.4113 | 4.0910 | 0.5021 | 4.3694 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6875, H2=0.0001, H3=0.3124
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
