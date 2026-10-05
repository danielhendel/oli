# BCV-002 — Measurement perturbation

- persona: P-09 (male), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 0.8811 | 2.5668 | 0.5004 | 1.7138 |
| perf | 89.5833 | 210000 | true | 0.6637 | 1.9236 | 0.4989 | 0.9645 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7957, H2=0.2043, H3=0.0000
- perf: P1=-0.0007, P3=1.0007

No product bands, no clinical claims. Synthetic fallback parameters only.
