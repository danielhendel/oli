# BCV-030 — Aggregate uncertainty propagation

- persona: P-03 (male), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 77.8000 | 130000 | true | 0.9472 | 2.7198 | 0.5003 | 1.9418 |
| perf | 55.2857 | 170000 | true | 3.4331 | 8.4753 | 0.4999 | 17.7324 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4800, H2=0.0001, H3=0.5200
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
