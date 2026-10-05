# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 1
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.7082 | 2.0535 | 0.5000 | 1.1001 |
| perf | 45.1316 | 120000 | true | 1.1090 | 3.5000 | 0.4966 | 3.0477 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6612, H2=0.0387, H3=0.3001
- perf: P1=1.0076, P3=-0.0076

No product bands, no clinical claims. Synthetic fallback parameters only.
