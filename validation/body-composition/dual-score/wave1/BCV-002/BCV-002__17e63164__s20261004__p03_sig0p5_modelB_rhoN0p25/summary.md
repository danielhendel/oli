# BCV-002 — Measurement perturbation

- persona: P-03 (male), sigma multiplier: 0.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 77.8000 | 120000 | true | 0.2436 | 0.7059 | 0.4989 | 0.1303 |
| perf | 55.2857 | 120000 | true | 0.8525 | 2.5004 | 0.4982 | 1.6171 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4450, H2=0.0000, H3=0.5550
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
