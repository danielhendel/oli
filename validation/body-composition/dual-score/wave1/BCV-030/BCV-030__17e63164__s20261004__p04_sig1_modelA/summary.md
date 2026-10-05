# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 1
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.5524 | 1.5031 | 0.4989 | 0.6179 |
| perf | 70.0000 | 210000 | true | 0.2928 | 1.1897 | 0.5006 | 0.2737 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8871, H2=0.1129, H3=0.0000
- perf: P1=-0.0028, P3=1.0028

No product bands, no clinical claims. Synthetic fallback parameters only.
