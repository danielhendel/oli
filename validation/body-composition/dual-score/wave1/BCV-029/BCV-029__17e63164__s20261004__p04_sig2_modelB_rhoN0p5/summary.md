# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 2
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 170000 | true | 1.0530 | 2.9219 | 0.4983 | 2.2738 |
| perf | 70.0000 | 280000 | true | 0.5877 | 2.3326 | 0.4997 | 1.0728 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8778, H2=0.1223, H3=-0.0001
- perf: P1=-0.0055, P3=1.0055

No product bands, no clinical claims. Synthetic fallback parameters only.
