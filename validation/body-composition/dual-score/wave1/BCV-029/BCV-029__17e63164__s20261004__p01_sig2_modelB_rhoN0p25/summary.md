# BCV-029 — Joint correlated measurement error propagation

- persona: P-01 (male), sigma multiplier: 2
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 92.1618 | 120000 | true | 0.7011 | 2.0374 | 0.5006 | 1.0828 |
| perf | 91.0000 | 200000 | true | 0.6148 | 4.6834 | 0.4998 | 3.2342 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.9709, H2=0.0000, H3=0.0291
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
