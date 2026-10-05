# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 1.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 150000 | true | 1.0388 | 2.9875 | 0.4992 | 2.3405 |
| perf | 45.1316 | 120000 | true | 1.7743 | 6.0067 | 0.4966 | 8.7146 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6773, H2=0.0201, H3=0.3026
- perf: P1=0.9772, P3=0.0228

No product bands, no clinical claims. Synthetic fallback parameters only.
