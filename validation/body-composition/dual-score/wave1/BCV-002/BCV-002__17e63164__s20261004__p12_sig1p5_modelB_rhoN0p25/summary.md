# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 1.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 200000 | true | 1.0627 | 3.0597 | 0.4993 | 2.4408 |
| perf | 45.1316 | 120000 | true | 1.6932 | 5.7805 | 0.4949 | 8.0403 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6559, H2=0.0386, H3=0.3054
- perf: P1=1.0141, P3=-0.0141

No product bands, no clinical claims. Synthetic fallback parameters only.
