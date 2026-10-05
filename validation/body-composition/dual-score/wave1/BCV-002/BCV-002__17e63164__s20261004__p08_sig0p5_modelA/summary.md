# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 0.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2943 | 0.8535 | 0.5016 | 0.1898 |
| perf | 22.8750 | 120000 | true | 0.2399 | 2.1037 | 0.3105 | 0.5435 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5832, H2=0.0665, H3=0.3503
- perf: P1=1.0438, P3=-0.0438

No product bands, no clinical claims. Synthetic fallback parameters only.
