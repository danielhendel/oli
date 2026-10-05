# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 190000 | true | 1.0533 | 2.9064 | 0.4998 | 2.2606 |
| perf | 70.0000 | 330000 | true | 0.5810 | 2.2894 | 0.5008 | 1.0421 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8777, H2=0.1224, H3=-0.0000
- perf: P1=-0.0218, P3=1.0218

No product bands, no clinical claims. Synthetic fallback parameters only.
