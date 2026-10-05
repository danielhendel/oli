# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 1
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.5778 | 1.6746 | 0.4991 | 0.7288 |
| perf | 22.8750 | 120000 | true | 0.4757 | 4.2195 | 0.3113 | 2.1950 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6170, H2=0.0759, H3=0.3071
- perf: P1=1.0442, P3=-0.0442

No product bands, no clinical claims. Synthetic fallback parameters only.
