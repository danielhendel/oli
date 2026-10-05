# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 1
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.5550 | 1.4966 | 0.5009 | 0.6152 |
| perf | 70.0000 | 260000 | true | 0.2919 | 1.1896 | 0.4998 | 0.2730 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8875, H2=0.1125, H3=0.0000
- perf: P1=-0.0046, P3=1.0046

No product bands, no clinical claims. Synthetic fallback parameters only.
