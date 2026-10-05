# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 0.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.1969 | 0.5740 | 0.4996 | 0.0855 |
| perf | 51.0000 | 120000 | true | 0.0000 | 0.4363 | 0.0005 | 0.0240 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8393, H2=0.1607, H3=0.0000
- perf: P1=0.0042, P3=0.9958

No product bands, no clinical claims. Synthetic fallback parameters only.
