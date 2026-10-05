# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 0.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2713 | 0.7886 | 0.4996 | 0.1618 |
| perf | 22.8750 | 120000 | true | 0.2422 | 2.2167 | 0.3847 | 0.6341 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6901, H2=-0.0138, H3=0.3238
- perf: P1=0.9681, P3=0.0319

No product bands, no clinical claims. Synthetic fallback parameters only.
