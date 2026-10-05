# BCV-030 — Aggregate uncertainty propagation

- persona: P-09 (male), sigma multiplier: 2
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 1.1791 | 3.4177 | 0.4968 | 3.0409 |
| perf | 89.5833 | 170000 | true | 0.8840 | 2.5505 | 0.5001 | 1.6958 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7970, H2=0.2030, H3=0.0000
- perf: P1=-0.0067, P3=1.0067

No product bands, no clinical claims. Synthetic fallback parameters only.
