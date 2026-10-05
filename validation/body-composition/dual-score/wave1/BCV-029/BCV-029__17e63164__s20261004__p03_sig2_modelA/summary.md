# BCV-029 — Joint correlated measurement error propagation

- persona: P-03 (male), sigma multiplier: 2
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 77.8000 | 120000 | true | 0.9508 | 2.7268 | 0.5013 | 1.9512 |
| perf | 55.2857 | 170000 | true | 3.4162 | 8.4520 | 0.5014 | 17.6879 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4804, H2=0.0000, H3=0.5196
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
