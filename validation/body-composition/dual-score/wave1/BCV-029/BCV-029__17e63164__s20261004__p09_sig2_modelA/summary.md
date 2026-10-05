# BCV-029 — Joint correlated measurement error propagation

- persona: P-09 (male), sigma multiplier: 2
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 1.1754 | 3.4115 | 0.5007 | 3.0343 |
| perf | 89.5833 | 250000 | true | 0.8823 | 2.5614 | 0.4998 | 1.7062 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7936, H2=0.2064, H3=0.0000
- perf: P1=-0.0032, P3=1.0032

No product bands, no clinical claims. Synthetic fallback parameters only.
