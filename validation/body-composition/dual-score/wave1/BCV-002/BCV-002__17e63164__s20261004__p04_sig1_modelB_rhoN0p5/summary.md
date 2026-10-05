# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 1
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.5554 | 1.5055 | 0.5007 | 0.6198 |
| perf | 70.0000 | 250000 | true | 0.2938 | 1.1950 | 0.4996 | 0.2761 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8858, H2=0.1142, H3=0.0000
- perf: P1=-0.0011, P3=1.0011

No product bands, no clinical claims. Synthetic fallback parameters only.
