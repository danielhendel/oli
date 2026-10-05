# BCV-030 — Aggregate uncertainty propagation

- persona: P-11 (female), sigma multiplier: 1
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 93.4182 | 120000 | true | 0.3758 | 1.0933 | 0.4968 | 0.3095 |
| perf | 87.0526 | 120000 | true | 1.1916 | 3.4603 | 0.5014 | 3.0572 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.9978, H2=0.0000, H3=0.0022
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
