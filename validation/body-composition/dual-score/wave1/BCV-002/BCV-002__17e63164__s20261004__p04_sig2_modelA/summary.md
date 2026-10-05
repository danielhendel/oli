# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 2
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 210000 | true | 1.0525 | 2.9307 | 0.4996 | 2.2779 |
| perf | 70.0000 | 290000 | true | 0.5793 | 2.2997 | 0.5003 | 1.0393 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8783, H2=0.1217, H3=-0.0000
- perf: P1=-0.0212, P3=1.0212

No product bands, no clinical claims. Synthetic fallback parameters only.
