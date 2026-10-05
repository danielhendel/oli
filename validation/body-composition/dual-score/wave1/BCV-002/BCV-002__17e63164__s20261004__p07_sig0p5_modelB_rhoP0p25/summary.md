# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 0.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.2430 | 0.7068 | 0.5001 | 0.1299 |
| perf | 52.6377 | 120000 | true | 0.4194 | 1.2231 | 0.4982 | 0.3868 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4976, H2=0.0442, H3=0.4582
- perf: P1=1.1183, P3=-0.1183

No product bands, no clinical claims. Synthetic fallback parameters only.
