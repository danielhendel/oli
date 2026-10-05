# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 2
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 150000 | true | 1.0474 | 2.9209 | 0.5005 | 2.2550 |
| perf | 70.0000 | 200000 | true | 0.5868 | 2.3343 | 0.5001 | 1.0744 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8779, H2=0.1221, H3=-0.0001
- perf: P1=-0.0055, P3=1.0055

No product bands, no clinical claims. Synthetic fallback parameters only.
