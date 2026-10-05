# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 1
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.5570 | 1.6164 | 0.4996 | 0.6783 |
| perf | 22.8750 | 120000 | true | 0.4850 | 4.3808 | 0.3637 | 2.4379 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6620, H2=0.0467, H3=0.2913
- perf: P1=0.9913, P3=0.0087

No product bands, no clinical claims. Synthetic fallback parameters only.
