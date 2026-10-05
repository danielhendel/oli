# BCV-002 — Measurement perturbation

- persona: P-09 (male), sigma multiplier: 1.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 0.8838 | 2.5651 | 0.5005 | 1.7149 |
| perf | 89.5833 | 260000 | true | 0.6631 | 1.9200 | 0.5000 | 0.9628 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7955, H2=0.2045, H3=0.0000
- perf: P1=-0.0010, P3=1.0010

No product bands, no clinical claims. Synthetic fallback parameters only.
