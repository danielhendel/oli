# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 1.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 180000 | true | 1.0536 | 3.0427 | 0.4990 | 2.4253 |
| perf | 45.1316 | 120000 | true | 1.5496 | 5.3606 | 0.4926 | 6.8638 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6549, H2=0.0384, H3=0.3067
- perf: P1=1.1111, P3=-0.1111

No product bands, no clinical claims. Synthetic fallback parameters only.
