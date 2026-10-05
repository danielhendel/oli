# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 230000 | true | 1.0550 | 2.9256 | 0.4991 | 2.2726 |
| perf | 70.0000 | 240000 | true | 0.5786 | 2.2440 | 0.4993 | 1.0061 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8783, H2=0.1218, H3=-0.0001
- perf: P1=-0.0402, P3=1.0402

No product bands, no clinical claims. Synthetic fallback parameters only.
