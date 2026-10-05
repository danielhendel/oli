# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.5983 | 1.7355 | 0.5010 | 0.7839 |
| perf | 51.0000 | 120000 | true | 0.1113 | 2.1906 | 0.1089 | 1.2130 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8190, H2=0.1645, H3=0.0165
- perf: P1=0.8658, P3=0.1342

No product bands, no clinical claims. Synthetic fallback parameters only.
