# BCV-029 — Joint correlated measurement error propagation

- persona: P-09 (male), sigma multiplier: 2
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 1.1738 | 3.4187 | 0.5007 | 3.0437 |
| perf | 89.5833 | 210000 | true | 0.8829 | 2.5717 | 0.4996 | 1.7122 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7939, H2=0.2061, H3=0.0000
- perf: P1=-0.0008, P3=1.0008

No product bands, no clinical claims. Synthetic fallback parameters only.
