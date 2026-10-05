# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 0.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.2331 | 0.6777 | 0.5003 | 0.1200 |
| perf | 52.6377 | 120000 | true | 0.4077 | 1.1853 | 0.5005 | 0.3642 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5335, H2=0.0139, H3=0.4526
- perf: P1=1.1650, P3=-0.1650

No product bands, no clinical claims. Synthetic fallback parameters only.
