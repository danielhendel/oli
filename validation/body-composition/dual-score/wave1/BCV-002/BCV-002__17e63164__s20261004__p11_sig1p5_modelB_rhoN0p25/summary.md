# BCV-002 — Measurement perturbation

- persona: P-11 (female), sigma multiplier: 1.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 93.4182 | 120000 | true | 0.5690 | 1.6562 | 0.5004 | 0.7079 |
| perf | 87.0526 | 200000 | true | 1.7915 | 4.5029 | 0.4978 | 6.3649 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.9763, H2=0.0000, H3=0.0237
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
