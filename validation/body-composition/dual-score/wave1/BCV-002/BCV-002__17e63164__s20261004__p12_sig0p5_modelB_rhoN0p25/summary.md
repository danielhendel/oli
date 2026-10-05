# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 0.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3544 | 1.0245 | 0.4997 | 0.2739 |
| perf | 45.1316 | 120000 | true | 0.5605 | 1.6289 | 0.4948 | 0.6821 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6668, H2=0.0382, H3=0.2951
- perf: P1=1.0049, P3=-0.0049

No product bands, no clinical claims. Synthetic fallback parameters only.
