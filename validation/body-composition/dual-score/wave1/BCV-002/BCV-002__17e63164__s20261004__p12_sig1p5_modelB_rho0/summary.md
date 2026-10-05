# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 130000 | true | 1.0643 | 3.0570 | 0.4988 | 2.4530 |
| perf | 45.1316 | 120000 | true | 1.6286 | 5.5786 | 0.4939 | 7.4883 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6476, H2=0.0452, H3=0.3071
- perf: P1=1.0566, P3=-0.0566

No product bands, no clinical claims. Synthetic fallback parameters only.
