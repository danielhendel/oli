# BCV-030 — Aggregate uncertainty propagation

- persona: P-02 (male), sigma multiplier: 1
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 73.1000 | 120000 | true | 0.5393 | 1.5519 | 0.4762 | 0.5969 |
| perf | 88.8261 | 160000 | true | 0.9902 | 2.4477 | 0.5002 | 1.9236 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8609, H2=0.0000, H3=0.1391
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
