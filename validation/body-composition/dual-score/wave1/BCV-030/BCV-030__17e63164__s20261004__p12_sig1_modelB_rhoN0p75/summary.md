# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 1
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.6761 | 1.9604 | 0.4990 | 1.0031 |
| perf | 45.1316 | 120000 | true | 1.2126 | 3.7767 | 0.4969 | 3.5634 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7265, H2=-0.0105, H3=0.2840
- perf: P1=0.9332, P3=0.0668

No product bands, no clinical claims. Synthetic fallback parameters only.
