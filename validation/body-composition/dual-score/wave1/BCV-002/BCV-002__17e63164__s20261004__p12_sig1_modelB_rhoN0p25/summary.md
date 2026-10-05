# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 1
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.7082 | 2.0461 | 0.4995 | 1.0955 |
| perf | 45.1316 | 120000 | true | 1.1168 | 3.5211 | 0.4949 | 3.0795 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6583, H2=0.0390, H3=0.3028
- perf: P1=1.0086, P3=-0.0086

No product bands, no clinical claims. Synthetic fallback parameters only.
