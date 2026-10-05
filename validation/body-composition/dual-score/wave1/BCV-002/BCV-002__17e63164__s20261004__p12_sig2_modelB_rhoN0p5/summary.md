# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 150000 | true | 1.3820 | 3.9719 | 0.4992 | 4.1314 |
| perf | 45.1316 | 120000 | true | 2.4216 | 8.4760 | 0.4966 | 17.0969 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6714, H2=0.0220, H3=0.3067
- perf: P1=0.9814, P3=0.0186

No product bands, no clinical claims. Synthetic fallback parameters only.
