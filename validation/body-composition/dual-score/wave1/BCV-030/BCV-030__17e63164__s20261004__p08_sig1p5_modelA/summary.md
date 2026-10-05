# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 1.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.8442 | 2.4672 | 0.4982 | 1.5706 |
| perf | 22.8750 | 120000 | true | 0.7081 | 6.3429 | 0.3114 | 4.9772 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6531, H2=0.0867, H3=0.2602
- perf: P1=1.0443, P3=-0.0443

No product bands, no clinical claims. Synthetic fallback parameters only.
