# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 140000 | true | 0.8133 | 2.2106 | 0.5005 | 1.3198 |
| perf | 70.0000 | 290000 | true | 0.4353 | 1.7469 | 0.5003 | 0.5952 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8803, H2=0.1197, H3=0.0000
- perf: P1=-0.0167, P3=1.0167

No product bands, no clinical claims. Synthetic fallback parameters only.
