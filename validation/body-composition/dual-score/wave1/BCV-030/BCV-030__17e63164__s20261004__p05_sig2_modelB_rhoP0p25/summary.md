# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8035 | 2.3391 | 0.4988 | 1.4228 |
| perf | 51.0000 | 160000 | true | 0.3975 | 4.6260 | 0.1798 | 3.9246 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8003, H2=0.1620, H3=0.0377
- perf: P1=0.8631, P3=0.1369

No product bands, no clinical claims. Synthetic fallback parameters only.
