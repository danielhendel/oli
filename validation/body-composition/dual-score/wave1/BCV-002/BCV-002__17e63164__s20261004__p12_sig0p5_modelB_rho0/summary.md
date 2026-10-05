# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 0.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 120000 | true | 0.3577 | 1.0329 | 0.4992 | 0.2792 |
| perf | 45.1316 | 120000 | true | 0.5312 | 1.5494 | 0.4940 | 0.6162 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6538, H2=0.0429, H3=0.3033
- perf: P1=1.0522, P3=-0.0522

No product bands, no clinical claims. Synthetic fallback parameters only.
