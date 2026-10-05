# BCV-030 — Aggregate uncertainty propagation

- persona: P-12 (female), sigma multiplier: 0.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3535 | 1.0306 | 0.4999 | 0.2761 |
| perf | 45.1316 | 120000 | true | 0.5580 | 1.6197 | 0.4964 | 0.6773 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6617, H2=0.0375, H3=0.3007
- perf: P1=1.0032, P3=-0.0032

No product bands, no clinical claims. Synthetic fallback parameters only.
