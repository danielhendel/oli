# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 0.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3397 | 0.9806 | 0.4991 | 0.2520 |
| perf | 45.1316 | 120000 | true | 0.6024 | 1.7578 | 0.4962 | 0.7928 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7279, H2=-0.0079, H3=0.2800
- perf: P1=0.9250, P3=0.0750

No product bands, no clinical claims. Synthetic fallback parameters only.
