# BCV-030 — Aggregate uncertainty propagation

- persona: P-09 (male), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 1.1787 | 3.4224 | 0.4968 | 3.0409 |
| perf | 89.5833 | 250000 | true | 0.8774 | 2.5402 | 0.4993 | 1.6849 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7934, H2=0.2066, H3=0.0000
- perf: P1=-0.0031, P3=1.0031

No product bands, no clinical claims. Synthetic fallback parameters only.
