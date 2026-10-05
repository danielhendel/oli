# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 2
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.9786 | 2.8377 | 0.5018 | 2.1035 |
| perf | 52.6377 | 160000 | true | 1.7441 | 5.0459 | 0.5024 | 6.6480 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4882, H2=0.0544, H3=0.4574
- perf: P1=1.0782, P3=-0.0782

No product bands, no clinical claims. Synthetic fallback parameters only.
