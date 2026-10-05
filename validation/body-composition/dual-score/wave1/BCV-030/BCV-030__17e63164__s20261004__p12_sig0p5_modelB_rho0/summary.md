# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 0.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3551 | 1.0315 | 0.4992 | 0.2774 |
| perf | 45.1316 | 120000 | true | 0.5321 | 1.5520 | 0.4981 | 0.6152 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6543, H2=0.0436, H3=0.3021
- perf: P1=1.0531, P3=-0.0531

No product bands, no clinical claims. Synthetic fallback parameters only.
