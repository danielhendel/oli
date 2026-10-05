# BCV-029 — Joint correlated measurement error propagation

- persona: P-11 (female), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 93.4182 | 120000 | true | 0.7640 | 2.1818 | 0.4980 | 1.2449 |
| perf | 87.0526 | 130000 | true | 2.3745 | 5.7795 | 0.5020 | 10.1618 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.9355, H2=0.0000, H3=0.0645
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
