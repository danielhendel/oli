# BCV-030 — Aggregate uncertainty propagation

- persona: P-03 (male), sigma multiplier: 0.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 77.8000 | 120000 | true | 0.2427 | 0.7072 | 0.4992 | 0.1295 |
| perf | 55.2857 | 120000 | true | 0.8540 | 2.4980 | 0.4986 | 1.6140 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4439, H2=0.0000, H3=0.5561
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
