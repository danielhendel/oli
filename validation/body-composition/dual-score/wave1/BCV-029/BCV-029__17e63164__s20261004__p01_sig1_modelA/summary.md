# BCV-029 — Joint correlated measurement error propagation

- persona: P-01 (male), sigma multiplier: 1
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 92.1618 | 120000 | true | 0.3488 | 1.0144 | 0.5003 | 0.2671 |
| perf | 91.0000 | 150000 | true | 0.3074 | 2.3666 | 0.5010 | 0.8217 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.9996, H2=0.0000, H3=0.0004
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
