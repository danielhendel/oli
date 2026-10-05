# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 1.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.7035 | 2.0516 | 0.5001 | 1.0901 |
| perf | 52.6377 | 120000 | true | 1.2187 | 3.5539 | 0.5004 | 3.2795 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5339, H2=0.0128, H3=0.4533
- perf: P1=1.1657, P3=-0.1657

No product bands, no clinical claims. Synthetic fallback parameters only.
