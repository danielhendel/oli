# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 0.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.2339 | 0.6811 | 0.4979 | 0.1202 |
| perf | 52.6377 | 120000 | true | 0.4058 | 1.1807 | 0.4980 | 0.3626 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5331, H2=0.0142, H3=0.4527
- perf: P1=1.1653, P3=-0.1653

No product bands, no clinical claims. Synthetic fallback parameters only.
