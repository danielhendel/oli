# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 1
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.7098 | 2.0545 | 0.4992 | 1.1036 |
| perf | 45.1316 | 120000 | true | 1.0646 | 3.3439 | 0.4940 | 2.7829 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6524, H2=0.0435, H3=0.3042
- perf: P1=1.0552, P3=-0.0552

No product bands, no clinical claims. Synthetic fallback parameters only.
