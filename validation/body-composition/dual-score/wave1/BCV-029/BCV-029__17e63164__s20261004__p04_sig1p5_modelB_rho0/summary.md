# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.8103 | 2.1994 | 0.4995 | 1.3135 |
| perf | 70.0000 | 230000 | true | 0.4353 | 1.7636 | 0.4999 | 0.6023 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8813, H2=0.1187, H3=-0.0000
- perf: P1=-0.0123, P3=1.0123

No product bands, no clinical claims. Synthetic fallback parameters only.
