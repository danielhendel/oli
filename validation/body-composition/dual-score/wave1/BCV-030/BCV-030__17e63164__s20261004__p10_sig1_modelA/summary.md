# BCV-030 — Aggregate uncertainty propagation

- persona: P-10 (male), sigma multiplier: 1
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 76.0742 | 120000 | true | 0.6104 | 1.7569 | 0.4985 | 0.8096 |
| perf | 80.1304 | 230000 | true | 0.9405 | 2.7415 | 0.4998 | 1.9514 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6918, H2=0.0000, H3=0.3081
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
