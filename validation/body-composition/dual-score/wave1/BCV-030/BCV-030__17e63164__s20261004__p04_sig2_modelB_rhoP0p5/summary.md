# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 210000 | true | 1.0500 | 2.9245 | 0.4981 | 2.2773 |
| perf | 70.0000 | 220000 | true | 0.5786 | 2.2521 | 0.5004 | 1.0067 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8785, H2=0.1215, H3=-0.0001
- perf: P1=-0.0397, P3=1.0397

No product bands, no clinical claims. Synthetic fallback parameters only.
