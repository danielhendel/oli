# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 220000 | true | 1.3833 | 3.9708 | 0.4992 | 4.1366 |
| perf | 45.1316 | 120000 | true | 2.0036 | 7.2927 | 0.4947 | 12.4351 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6730, H2=0.0212, H3=0.3058
- perf: P1=1.1684, P3=-0.1684

No product bands, no clinical claims. Synthetic fallback parameters only.
