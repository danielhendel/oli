# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 1
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.4867 | 1.4037 | 0.5018 | 0.5173 |
| perf | 52.6377 | 120000 | true | 0.8967 | 2.6095 | 0.5027 | 1.7710 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5010, H2=0.0454, H3=0.4535
- perf: P1=1.0427, P3=-0.0427

No product bands, no clinical claims. Synthetic fallback parameters only.
