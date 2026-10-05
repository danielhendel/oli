# BCV-029 — Joint correlated measurement error propagation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8045 | 2.3742 | 0.5006 | 1.4617 |
| perf | 51.0000 | 170000 | true | 0.4914 | 4.7744 | 0.2009 | 4.1806 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7753, H2=0.1719, H3=0.0528
- perf: P1=0.8451, P3=0.1549

No product bands, no clinical claims. Synthetic fallback parameters only.
