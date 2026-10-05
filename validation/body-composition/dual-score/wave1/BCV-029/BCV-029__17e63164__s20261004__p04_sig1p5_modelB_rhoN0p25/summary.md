# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 150000 | true | 0.8081 | 2.1996 | 0.4989 | 1.3096 |
| perf | 70.0000 | 190000 | true | 0.4374 | 1.7641 | 0.5004 | 0.6063 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8804, H2=0.1196, H3=-0.0000
- perf: P1=-0.0082, P3=1.0082

No product bands, no clinical claims. Synthetic fallback parameters only.
