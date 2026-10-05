# BCV-029 — Joint correlated measurement error propagation

- persona: P-09 (male), sigma multiplier: 1.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 0.8854 | 2.5669 | 0.5007 | 1.7228 |
| perf | 89.5833 | 190000 | true | 0.6615 | 1.9195 | 0.4993 | 0.9598 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7951, H2=0.2049, H3=0.0000
- perf: P1=-0.0014, P3=1.0014

No product bands, no clinical claims. Synthetic fallback parameters only.
