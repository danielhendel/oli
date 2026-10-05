# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 1
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.5529 | 1.4962 | 0.4990 | 0.6149 |
| perf | 70.0000 | 210000 | true | 0.2924 | 1.1951 | 0.5005 | 0.2739 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8867, H2=0.1133, H3=0.0000
- perf: P1=-0.0045, P3=1.0045

No product bands, no clinical claims. Synthetic fallback parameters only.
