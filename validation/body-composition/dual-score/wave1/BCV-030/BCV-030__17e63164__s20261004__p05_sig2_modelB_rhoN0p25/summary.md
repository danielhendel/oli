# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8028 | 2.3371 | 0.4983 | 1.4224 |
| perf | 51.0000 | 150000 | true | 0.2942 | 4.3970 | 0.1614 | 3.6008 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8035, H2=0.1607, H3=0.0358
- perf: P1=0.8989, P3=0.1011

No product bands, no clinical claims. Synthetic fallback parameters only.
