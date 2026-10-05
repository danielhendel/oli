# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 1
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 140000 | true | 0.7117 | 2.0533 | 0.5010 | 1.0990 |
| perf | 45.1316 | 120000 | true | 1.1174 | 3.4797 | 0.4964 | 3.0550 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6608, H2=0.0386, H3=0.3006
- perf: P1=1.0094, P3=-0.0094

No product bands, no clinical claims. Synthetic fallback parameters only.
