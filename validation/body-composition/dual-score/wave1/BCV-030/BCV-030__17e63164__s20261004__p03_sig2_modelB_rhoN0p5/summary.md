# BCV-030 — Aggregate uncertainty propagation

- persona: P-03 (male), sigma multiplier: 2
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 77.8000 | 120000 | true | 0.9518 | 2.7310 | 0.4992 | 1.9525 |
| perf | 55.2857 | 120000 | true | 3.4279 | 8.4332 | 0.4988 | 17.6839 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4803, H2=0.0001, H3=0.5197
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
