# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 1.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 210000 | true | 1.0708 | 3.0718 | 0.5017 | 2.4745 |
| perf | 45.1316 | 120000 | true | 1.6245 | 5.5714 | 0.4969 | 7.4432 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6476, H2=0.0428, H3=0.3095
- perf: P1=1.0584, P3=-0.0584

No product bands, no clinical claims. Synthetic fallback parameters only.
