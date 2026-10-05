# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 1
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.5316 | 1.5436 | 0.4988 | 0.6189 |
| perf | 22.8750 | 120000 | true | 0.4826 | 4.4569 | 0.3848 | 2.5621 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7285, H2=0.0005, H3=0.2710
- perf: P1=0.9683, P3=0.0317

No product bands, no clinical claims. Synthetic fallback parameters only.
