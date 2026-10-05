# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 1.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.7225 | 2.1121 | 0.5001 | 1.1574 |
| perf | 52.6377 | 120000 | true | 1.2627 | 3.6543 | 0.4980 | 3.4946 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4996, H2=0.0466, H3=0.4538
- perf: P1=1.1183, P3=-0.1183

No product bands, no clinical claims. Synthetic fallback parameters only.
