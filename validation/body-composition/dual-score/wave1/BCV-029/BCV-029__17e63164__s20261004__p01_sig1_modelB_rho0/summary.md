# BCV-029 — Joint correlated measurement error propagation

- persona: P-01 (male), sigma multiplier: 1
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 92.1618 | 120000 | true | 0.3505 | 1.0130 | 0.5003 | 0.2671 |
| perf | 91.0000 | 150000 | true | 0.3062 | 2.3578 | 0.5010 | 0.8182 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.9997, H2=0.0000, H3=0.0003
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
