# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 250000 | true | 1.4055 | 4.0442 | 0.5009 | 4.2829 |
| perf | 45.1316 | 120000 | true | 2.3342 | 8.1783 | 0.4969 | 15.9344 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6461, H2=0.0391, H3=0.3148
- perf: P1=1.0177, P3=-0.0177

No product bands, no clinical claims. Synthetic fallback parameters only.
