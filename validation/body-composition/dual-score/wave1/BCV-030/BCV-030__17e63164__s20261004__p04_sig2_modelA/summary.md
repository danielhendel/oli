# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 2
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 160000 | true | 1.0445 | 2.8983 | 0.4984 | 2.2454 |
| perf | 70.0000 | 320000 | true | 0.5791 | 2.2967 | 0.4993 | 1.0417 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8776, H2=0.1224, H3=-0.0000
- perf: P1=-0.0214, P3=1.0214

No product bands, no clinical claims. Synthetic fallback parameters only.
