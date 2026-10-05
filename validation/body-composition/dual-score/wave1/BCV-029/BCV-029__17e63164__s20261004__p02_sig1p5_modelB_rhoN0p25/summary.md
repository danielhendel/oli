# BCV-029 — Joint correlated measurement error propagation

- persona: P-02 (male), sigma multiplier: 1.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 73.1000 | 120000 | true | 0.8014 | 2.3018 | 0.4802 | 1.3253 |
| perf | 88.8261 | 160000 | true | 1.4826 | 3.5979 | 0.5007 | 3.7373 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8647, H2=-0.0000, H3=0.1353
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
