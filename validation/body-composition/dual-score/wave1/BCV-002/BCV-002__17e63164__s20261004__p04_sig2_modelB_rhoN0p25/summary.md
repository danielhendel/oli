# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 2
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 190000 | true | 1.0517 | 2.9134 | 0.4997 | 2.2671 |
| perf | 70.0000 | 220000 | true | 0.5828 | 2.3115 | 0.4995 | 1.0575 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8782, H2=0.1219, H3=-0.0000
- perf: P1=-0.0134, P3=1.0134

No product bands, no clinical claims. Synthetic fallback parameters only.
