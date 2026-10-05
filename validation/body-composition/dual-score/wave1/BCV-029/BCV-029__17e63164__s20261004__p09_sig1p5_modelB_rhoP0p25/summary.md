# BCV-029 — Joint correlated measurement error propagation

- persona: P-09 (male), sigma multiplier: 1.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 0.8771 | 2.5607 | 0.5007 | 1.7060 |
| perf | 89.5833 | 240000 | true | 0.6603 | 1.9204 | 0.4998 | 0.9619 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7941, H2=0.2059, H3=0.0000
- perf: P1=-0.0009, P3=1.0009

No product bands, no clinical claims. Synthetic fallback parameters only.
