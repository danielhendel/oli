# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 0.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.2783 | 0.8020 | 0.4994 | 0.1681 |
| perf | 70.0000 | 340000 | true | 0.1460 | 0.5987 | 0.5003 | 0.0689 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8937, H2=0.1063, H3=0.0000
- perf: P1=-0.0000, P3=1.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
