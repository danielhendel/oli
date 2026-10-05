# BCV-030 — Aggregate uncertainty propagation

- persona: P-09 (male), sigma multiplier: 2
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 1.1762 | 3.4069 | 0.4968 | 3.0344 |
| perf | 89.5833 | 260000 | true | 0.8792 | 2.5681 | 0.4991 | 1.7063 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7936, H2=0.2064, H3=0.0000
- perf: P1=-0.0007, P3=1.0007

No product bands, no clinical claims. Synthetic fallback parameters only.
