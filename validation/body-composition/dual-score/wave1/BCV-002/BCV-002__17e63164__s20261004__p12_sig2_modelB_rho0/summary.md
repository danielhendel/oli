# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 250000 | true | 1.4125 | 4.0734 | 0.4996 | 4.3366 |
| perf | 45.1316 | 120000 | true | 2.2335 | 7.8709 | 0.4939 | 14.6930 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6395, H2=0.0444, H3=0.3161
- perf: P1=1.0600, P3=-0.0600

No product bands, no clinical claims. Synthetic fallback parameters only.
